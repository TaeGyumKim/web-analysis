import puppeteer, { Browser, Page, CDPSession } from 'puppeteer';
import type {
  NetworkRequest,
  PerformanceMetrics,
  FrameCapture,
  LongTask,
  AnalysisResult,
  AnalysisOptions,
  DOMElementTiming
} from '~/types/performance';
import { logger } from './logger';

interface NetworkRequestData {
  requestId: string;
  url: string;
  resourceType: string;
  startTime: number;
  endTime?: number;
  size?: number;
  status?: number;
}

export class PerformanceCollector {
  private browser: Browser | null = null;
  private requests: Map<string, NetworkRequestData> = new Map();
  private frames: FrameCapture[] = [];
  private captureInterval: NodeJS.Timeout | null = null;
  private startTime: number = 0;

  async initialize() {
    if (!this.browser) {
      // Use system Chromium in Docker environment
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH;

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath: executablePath || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-extensions'
        ]
      });

      logger.info(
        `Browser initialized${executablePath ? ` with executable: ${executablePath}` : ' with bundled Chromium'}`
      );
    }
  }

  async analyze(url: string, options: AnalysisOptions): Promise<AnalysisResult> {
    await this.initialize();

    const page = await this.browser!.newPage();
    const client = await page.target().createCDPSession();

    this.startTime = Date.now();
    this.requests.clear();
    this.frames = [];

    logger.info(`Starting analysis: ${url}`);

    try {
      // Enable necessary CDP domains
      await client.send('Network.enable');
      await client.send('Performance.enable');
      await client.send('Page.enable');

      // Apply network throttling if specified
      if (options.networkThrottling && options.networkThrottling !== 'none') {
        await this.applyNetworkThrottling(client, options.networkThrottling);
      }

      // Apply CPU throttling if specified
      if (options.cpuThrottling) {
        await client.send('Emulation.setCPUThrottlingRate', {
          rate: options.cpuThrottling
        });
      }

      // Set viewport size
      const viewportWidth = options.viewportWidth || 1920;
      const viewportHeight = options.viewportHeight || 1080;
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: 1
      });

      // Set up network monitoring
      this.setupNetworkMonitoring(client);

      // Set up frame capture
      if (options.captureScreenshots) {
        const screenshotInterval = options.screenshotInterval || 100;
        this.startFrameCapture(page, screenshotInterval);
      }

      // Navigate to URL with no timeout (infinite wait)
      const waitCondition = options.waitUntil || 'networkidle2';
      logger.debug(`Navigating with no timeout (infinite wait), waitUntil: ${waitCondition}`);

      await page.goto(url, {
        waitUntil: waitCondition as any,
        timeout: 0
      });

      // Wait for page to be fully rendered
      await this.waitForRenderComplete(page, options);

      // Collect all metrics
      const metrics = await this.collectMetrics(page);
      const longTasks = await this.collectLongTasks(page);
      const domElements = await this.collectDOMElements(page);
      const capturedHTML = await this.captureHTML(page);

      // Calculate running time
      const runningTime = Date.now() - this.startTime;

      // Convert requests map to array
      const networkRequests = this.convertRequestsToArray();

      // Trim frames to only include up to last resource load time + buffer
      this.trimFramesToResourceLoadTime(networkRequests);

      // Calculate performance score
      const performanceScore = await import('~/utils/scoreCalculator').then(m =>
        m.computePerformanceScore(metrics, networkRequests, this.frames)
      );

      logger.info(`Analysis completed: ${url} (${runningTime}ms)`);

      return {
        url,
        timestamp: this.startTime,
        runningTime,
        metrics,
        networkRequests,
        frames: this.frames,
        longTasks,
        performanceScore,
        domElements,
        capturedHTML
      };
    } catch (error) {
      logger.error('Analysis failed:', {
        url,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    } finally {
      // Cleanup resources
      this.stopFrameCapture();

      try {
        await client.detach();
      } catch (detachError) {
        logger.warn('Failed to detach CDP session:', detachError);
      }

      try {
        await page.close();
      } catch (closeError) {
        logger.error('Failed to close page:', closeError);
      }

      logger.debug('Resource cleanup completed');
    }
  }

  private setupNetworkMonitoring(client: CDPSession) {
    client.on('Network.requestWillBeSent', (params: any) => {
      const currentTime = (Date.now() - this.startTime) / 1000;
      this.requests.set(params.requestId, {
        requestId: params.requestId,
        url: params.request.url,
        resourceType: params.type || 'other',
        startTime: currentTime
      });
    });

    client.on('Network.responseReceived', (params: any) => {
      const request = this.requests.get(params.requestId);
      if (request) {
        request.status = params.response.status;
      }
    });

    client.on('Network.loadingFinished', (params: any) => {
      const request = this.requests.get(params.requestId);
      if (request) {
        const currentTime = (Date.now() - this.startTime) / 1000;
        request.endTime = currentTime;
        request.size = params.encodedDataLength || 0;
      }
    });

    client.on('Network.loadingFailed', (params: any) => {
      const request = this.requests.get(params.requestId);
      if (request) {
        const currentTime = (Date.now() - this.startTime) / 1000;
        request.endTime = currentTime;
      }
    });
  }

  private startFrameCapture(page: Page, interval: number = 100) {
    // Clear any existing interval before starting a new one
    // This prevents orphaned intervals if startFrameCapture is called multiple times
    this.stopFrameCapture();

    // Skip initial frames to avoid black/empty screens
    let captureCount = 0;
    const skipFrames = 3; // Skip first 3 captures (300ms at 100ms interval)

    this.captureInterval = setInterval(async () => {
      try {
        captureCount++;

        // Skip initial frames to avoid black screen during navigation start
        if (captureCount <= skipFrames) {
          return;
        }

        // Use full page screenshot to capture all content
        const screenshot = await page.screenshot({
          encoding: 'base64',
          type: 'png',
          fullPage: true
        });
        const timestamp = (Date.now() - this.startTime) / 1000;

        this.frames.push({
          timestamp,
          screenshot: screenshot as string
        });
      } catch {
        // Silently ignore screenshot errors (happens when page is closed)
      }
    }, interval); // Configurable capture interval
  }

  private stopFrameCapture() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  private async collectMetrics(page: Page): Promise<PerformanceMetrics> {
    // Inject performance collection script
    const rawMetrics = await page.evaluate(() => {
      return new Promise(resolve => {
        const metrics: any = {};

        // Get navigation timing
        const navTiming = performance.timing;
        const navigationStart = navTiming.navigationStart;

        metrics.ttfb = navTiming.responseStart - navigationStart;
        metrics.domContentLoaded = navTiming.domContentLoadedEventEnd - navigationStart;
        metrics.loadComplete = navTiming.loadEventEnd - navigationStart;

        // Get paint timing
        const paintEntries = performance.getEntriesByType('paint');
        for (const entry of paintEntries) {
          if (entry.name === 'first-contentful-paint') {
            metrics.fcp = entry.startTime;
          }
        }

        // CLS calculation
        let clsValue = 0;

        // Observer for LCP
        const lcpObserver = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });

        // Observer for CLS
        const clsObserver = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });

        try {
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

          // Observe layout shifts for CLS
          try {
            clsObserver.observe({ type: 'layout-shift', buffered: true });
          } catch {
            // layout-shift may not be supported in all browsers
            console.warn('layout-shift observation not supported');
          }

          // Wait a bit for metrics to be collected
          setTimeout(() => {
            lcpObserver.disconnect();
            clsObserver.disconnect();

            // Calculate TBT (Total Blocking Time) from long tasks
            const longTasks = performance.getEntriesByType('longtask') as any[];
            let tbt = 0;
            for (const task of longTasks) {
              const blockingTime = task.duration - 50;
              if (blockingTime > 0) {
                tbt += blockingTime;
              }
            }
            metrics.tbt = tbt;
            metrics.cls = clsValue;

            resolve(metrics);
          }, 500);
        } catch {
          metrics.cls = clsValue;
          resolve(metrics);
        }
      });
    });

    return rawMetrics as PerformanceMetrics;
  }

  private async collectLongTasks(page: Page): Promise<LongTask[]> {
    // Collect long tasks from the page
    const longTasksData = await page.evaluate(() => {
      const longTasks = performance.getEntriesByType('longtask') as any[];
      return longTasks.map((task: any) => ({
        name: task.name || 'unknown',
        startTime: task.startTime,
        duration: task.duration,
        attribution: task.attribution?.[0]?.name || undefined
      }));
    });

    return longTasksData as LongTask[];
  }

  private async applyNetworkThrottling(client: CDPSession, profile: string) {
    const { NETWORK_PROFILES } = await import('~/utils/constants');

    const throttling = NETWORK_PROFILES[profile as keyof typeof NETWORK_PROFILES];
    if (throttling) {
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        ...throttling
      });
    }
  }

  /**
   * Wait for the page to be fully rendered
   * Comprehensive strategy to ensure all resources are loaded:
   * 1. Wait for network to be completely idle
   * 2. Wait for all images (including lazy-loaded and background images)
   * 3. Wait for fonts
   * 4. Wait for DOM stability
   * 5. Final verification pass
   */
  private async waitForRenderComplete(page: Page, options: AnalysisOptions): Promise<void> {
    const maxWaitTime = options.maxRenderWaitTime || 30000;
    const stabilityThreshold = options.renderStabilityTime || 1000;

    logger.debug(
      `Waiting for render complete (max: ${maxWaitTime}ms, stability: ${stabilityThreshold}ms)`
    );

    const startWaitTime = Date.now();
    const getElapsed = () => Date.now() - startWaitTime;
    const getRemainingTime = () => Math.max(0, maxWaitTime - getElapsed());

    try {
      // Step 1: Wait for network requests to complete
      logger.debug('Step 1: Waiting for network idle...');
      await this.waitForNetworkIdle(page, Math.min(getRemainingTime(), 15000));

      // Step 2: Wait for all images to load (including lazy-loaded)
      logger.debug('Step 2: Waiting for images...');
      await this.waitForAllImages(page, Math.min(getRemainingTime(), 15000));

      // Step 3: Wait for fonts to load
      logger.debug('Step 3: Waiting for fonts...');
      await page.evaluate(() => {
        return Promise.race([
          (document as any).fonts?.ready || Promise.resolve(),
          new Promise(resolve => setTimeout(resolve, 5000))
        ]);
      });

      // Step 4: Wait for DOM stability (no mutations for stabilityThreshold)
      logger.debug('Step 4: Waiting for DOM stability...');
      await this.waitForDOMStability(page, stabilityThreshold, Math.min(getRemainingTime(), 10000));

      // Step 5: Final verification - check if any new resources appeared
      logger.debug('Step 5: Final verification...');
      await this.finalResourceCheck(page, Math.min(getRemainingTime(), 5000));

      // Final safety wait
      const finalWait = Math.min(getRemainingTime(), 1000);
      if (finalWait > 0) {
        await new Promise<void>(resolve => setTimeout(resolve, finalWait));
      }

      logger.debug(`Render complete wait finished in ${getElapsed()}ms`);
    } catch (error) {
      logger.warn('Error during render wait, continuing anyway:', error);
      await new Promise<void>(resolve => setTimeout(resolve, 2000));
    }
  }

  /**
   * Wait for network to be truly idle (no pending requests)
   */
  private async waitForNetworkIdle(_page: Page, timeout: number): Promise<void> {
    const pendingRequests = new Set<string>();

    // Track ongoing requests
    for (const [, req] of this.requests) {
      if (!req.endTime) {
        pendingRequests.add(req.requestId);
      }
    }

    if (pendingRequests.size === 0) {
      // Already idle, but wait a bit for any new requests
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }

    // Wait for pending requests to complete
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      let stillPending = 0;
      for (const [, req] of this.requests) {
        if (!req.endTime) {
          stillPending++;
        }
      }

      if (stillPending === 0) {
        // Wait a bit more for any new requests that might come in
        await new Promise(resolve => setTimeout(resolve, 500));

        // Check again
        let newPending = 0;
        for (const [, req] of this.requests) {
          if (!req.endTime) {
            newPending++;
          }
        }

        if (newPending === 0) {
          return;
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Wait for all images to load, including lazy-loaded and background images
   */
  private async waitForAllImages(page: Page, timeout: number): Promise<void> {
    await page.evaluate((timeoutMs: number) => {
      return new Promise<void>(resolve => {
        const startTime = Date.now();
        const checkInterval = 200;

        const checkAllImagesLoaded = (): boolean => {
          // Check regular images
          const images = Array.from(document.images);
          for (const img of images) {
            if (!img.complete && img.src) {
              return false;
            }
          }

          // Check background images by looking at computed styles
          const elementsWithBg = document.querySelectorAll('*');
          for (const el of elementsWithBg) {
            const style = window.getComputedStyle(el);
            const bgImage = style.backgroundImage;
            if (bgImage && bgImage !== 'none' && bgImage.includes('url(')) {
              // We can't easily check if background images are loaded,
              // but if they're in the DOM and we've waited, they should be loading
            }
          }

          // Check for video poster images
          const videos = document.querySelectorAll('video[poster]');
          for (const video of videos) {
            const poster = (video as HTMLVideoElement).poster;
            if (poster) {
              // Poster images should be loaded by now
            }
          }

          return true;
        };

        const waitForImages = () => {
          if (Date.now() - startTime > timeoutMs) {
            resolve();
            return;
          }

          // Get all images currently in DOM
          const images = Array.from(document.images);
          const unloadedImages = images.filter(img => !img.complete && img.src);

          if (unloadedImages.length === 0 && checkAllImagesLoaded()) {
            // Wait a bit more for any lazy-loaded images to appear
            setTimeout(() => {
              const newImages = Array.from(document.images);
              const stillUnloaded = newImages.filter(img => !img.complete && img.src);

              if (stillUnloaded.length === 0) {
                resolve();
              } else {
                waitForImages();
              }
            }, 500);
            return;
          }

          // Wait for current images to load
          const imagePromises = unloadedImages.map(
            img =>
              new Promise<void>(imgResolve => {
                if (img.complete) {
                  imgResolve();
                  return;
                }

                const onLoad = () => {
                  img.removeEventListener('load', onLoad);
                  img.removeEventListener('error', onError);
                  imgResolve();
                };

                const onError = () => {
                  img.removeEventListener('load', onLoad);
                  img.removeEventListener('error', onError);
                  imgResolve();
                };

                img.addEventListener('load', onLoad);
                img.addEventListener('error', onError);

                // Safety timeout for individual image
                setTimeout(() => {
                  img.removeEventListener('load', onLoad);
                  img.removeEventListener('error', onError);
                  imgResolve();
                }, 10000);
              })
          );

          Promise.all(imagePromises).then(() => {
            // Check again for new lazy-loaded images
            setTimeout(waitForImages, checkInterval);
          });
        };

        waitForImages();
      });
    }, timeout);
  }

  /**
   * Wait for DOM to stabilize (no mutations for a period)
   */
  private async waitForDOMStability(
    page: Page,
    stabilityMs: number,
    timeout: number
  ): Promise<void> {
    await page.evaluate(
      (stabilityThreshold: number, maxWait: number) => {
        return new Promise<void>(resolve => {
          let lastMutationTime = Date.now();
          let resolved = false;

          const observer = new MutationObserver(() => {
            lastMutationTime = Date.now();
          });

          observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
          });

          const checkStability = () => {
            if (resolved) return;

            const timeSinceLastMutation = Date.now() - lastMutationTime;
            if (timeSinceLastMutation >= stabilityThreshold) {
              resolved = true;
              observer.disconnect();
              resolve();
            } else {
              setTimeout(checkStability, 100);
            }
          };

          // Start checking after a short delay
          setTimeout(checkStability, 100);

          // Safety timeout
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              observer.disconnect();
              resolve();
            }
          }, maxWait);
        });
      },
      stabilityMs,
      timeout
    );
  }

  /**
   * Final check to ensure no new resources are loading
   */
  private async finalResourceCheck(page: Page, timeout: number): Promise<void> {
    await page.evaluate((timeoutMs: number) => {
      return new Promise<void>(resolve => {
        const startTime = Date.now();

        const check = () => {
          if (Date.now() - startTime > timeoutMs) {
            resolve();
            return;
          }

          // Check for any loading indicators
          const loadingElements = document.querySelectorAll(
            '[class*="loading"], [class*="spinner"], [class*="skeleton"], ' +
              '[data-loading="true"], [aria-busy="true"]'
          );

          let hasVisibleLoading = false;
          loadingElements.forEach(el => {
            const style = window.getComputedStyle(el);
            if (style.display !== 'none' && style.visibility !== 'hidden') {
              hasVisibleLoading = true;
            }
          });

          if (hasVisibleLoading) {
            setTimeout(check, 200);
            return;
          }

          // Check for incomplete images one more time
          const images = Array.from(document.images);
          const unloaded = images.filter(img => !img.complete && img.src);

          if (unloaded.length > 0) {
            setTimeout(check, 200);
            return;
          }

          // All checks passed
          resolve();
        };

        check();
      });
    }, timeout);
  }

  private convertRequestsToArray(): NetworkRequest[] {
    const result: NetworkRequest[] = [];

    for (const [id, req] of this.requests) {
      if (req.endTime) {
        result.push({
          id,
          url: req.url,
          type: req.resourceType,
          startTime: req.startTime,
          endTime: req.endTime,
          duration: (req.endTime - req.startTime) * 1000, // Convert to ms
          size: req.size || 0,
          status: req.status
        });
      }
    }

    return result.sort((a, b) => a.startTime - b.startTime);
  }

  /**
   * Trim frames to only include up to the last resource load time + buffer
   * This prevents capturing unnecessary frames after all resources have loaded
   */
  private trimFramesToResourceLoadTime(networkRequests: NetworkRequest[]): void {
    if (networkRequests.length === 0 || this.frames.length === 0) {
      return;
    }

    // Find the maximum end time of all network requests (in seconds)
    let maxEndTime = 0;
    for (const req of networkRequests) {
      if (req.endTime > maxEndTime) {
        maxEndTime = req.endTime;
      }
    }

    // Add a small buffer (1 second) after the last resource load
    const cutoffTime = maxEndTime + 1;

    // Filter frames to only include those before the cutoff time
    const originalCount = this.frames.length;
    this.frames = this.frames.filter(frame => frame.timestamp <= cutoffTime);

    // Always keep at least the last frame if we have any frames
    if (this.frames.length === 0 && originalCount > 0) {
      // This shouldn't happen, but as a safety measure, keep the first few frames
      this.frames = this.frames.slice(0, Math.min(5, originalCount));
    }

    logger.debug(
      `Trimmed frames from ${originalCount} to ${this.frames.length} (cutoff: ${cutoffTime.toFixed(2)}s)`
    );
  }

  private async collectDOMElements(page: Page): Promise<DOMElementTiming[]> {
    try {
      // Import constants
      const { RESOURCE_LIMITS } = await import('~/utils/constants');

      // Scroll to top before collecting elements to ensure accurate positions
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Collect DOM elements with their timing and position information
      const domElements = await page.evaluate((maxElements: number) => {
        const elements: DOMElementTiming[] = [];
        const allElements = document.querySelectorAll('*');

        // Helper function to generate a unique CSS selector
        const getSelector = (el: Element): string => {
          if (el.id) return `#${el.id}`;
          if (el.className && typeof el.className === 'string') {
            const classes = el.className.trim().split(/\s+/).join('.');
            if (classes) return `${el.tagName.toLowerCase()}.${classes}`;
          }
          return el.tagName.toLowerCase();
        };

        // Helper function to get associated resources (images, backgrounds, etc.)
        const getAssociatedResources = (el: Element): string[] => {
          const resources: string[] = [];

          // Check for img src
          if (el.tagName === 'IMG') {
            const img = el as HTMLImageElement;
            if (img.src && !img.src.startsWith('data:')) {
              resources.push(img.src);
            }
            // Also check srcset
            if (img.srcset) {
              const srcsetUrls = img.srcset.split(',').map(s => s.trim().split(' ')[0]);
              srcsetUrls.forEach(url => {
                if (url && !url.startsWith('data:')) {
                  resources.push(url);
                }
              });
            }
          }

          // Check for picture source elements
          if (el.tagName === 'SOURCE') {
            const source = el as HTMLSourceElement;
            if (source.srcset) {
              const srcsetUrls = source.srcset.split(',').map(s => s.trim().split(' ')[0]);
              srcsetUrls.forEach(url => {
                if (url && !url.startsWith('data:')) {
                  resources.push(url);
                }
              });
            }
          }

          // Check for background images (can have multiple)
          const computedStyle = window.getComputedStyle(el);
          const bgImage = computedStyle.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            // Match all url() patterns
            const urlRegex = /url\(['"]?([^'")\s]+)['"]?\)/g;
            let match;
            while ((match = urlRegex.exec(bgImage)) !== null) {
              if (match[1] && !match[1].startsWith('data:')) {
                resources.push(match[1]);
              }
            }
          }

          // Check for video/audio sources
          if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
            const media = el as HTMLMediaElement;
            if (media.src && !media.src.startsWith('data:')) {
              resources.push(media.src);
            }
            // Check poster for video
            if (el.tagName === 'VIDEO') {
              const video = el as HTMLVideoElement;
              if (video.poster && !video.poster.startsWith('data:')) {
                resources.push(video.poster);
              }
            }
          }

          // Check for iframe src
          if (el.tagName === 'IFRAME') {
            const iframe = el as HTMLIFrameElement;
            if (iframe.src && !iframe.src.startsWith('data:') && !iframe.src.startsWith('about:')) {
              resources.push(iframe.src);
            }
          }

          return resources;
        };

        // Limit to important elements (visible and reasonable size)
        for (let i = 0; i < allElements.length; i++) {
          const el = allElements[i];
          const rect = el.getBoundingClientRect();

          // Skip if too small
          if (rect.width < 10 || rect.height < 10) continue;

          const selector = getSelector(el);
          const associatedResources = getAssociatedResources(el);

          // Calculate absolute position in the full page (including scroll offset)
          const absoluteX = Math.round(rect.left + window.scrollX);
          const absoluteY = Math.round(rect.top + window.scrollY);

          elements.push({
            selector,
            tagName: el.tagName,
            className: el.className && typeof el.className === 'string' ? el.className : undefined,
            id: el.id || undefined,
            innerText:
              el.textContent && el.textContent.length > 0
                ? el.textContent.trim().substring(0, 50)
                : undefined,
            boundingBox: {
              x: absoluteX,
              y: absoluteY,
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            },
            associatedResources: associatedResources.length > 0 ? associatedResources : undefined
          });

          // Limit to maxElements to prevent huge payloads
          if (elements.length >= maxElements) break;
        }

        return elements;
      }, RESOURCE_LIMITS.maxDOMElements);

      // Match DOM elements with network resource timings
      const networkRequests = this.convertRequestsToArray();

      // Helper function for flexible URL matching
      const normalizeUrl = (url: string): string => {
        try {
          const parsed = new URL(url);
          // Remove protocol and trailing slash for comparison
          return (parsed.host + parsed.pathname).replace(/\/$/, '').toLowerCase();
        } catch {
          // If URL parsing fails, just normalize basic stuff
          return url
            .replace(/^https?:\/\//, '')
            .replace(/\/$/, '')
            .toLowerCase();
        }
      };

      const findMatchingRequest = (resourceUrl: string) => {
        // First try exact match
        let matched = networkRequests.find(req => req.url === resourceUrl);
        if (matched) return matched;

        // Try normalized URL match
        const normalizedResource = normalizeUrl(resourceUrl);
        matched = networkRequests.find(req => normalizeUrl(req.url) === normalizedResource);
        if (matched) return matched;

        // Try partial match (resource URL contained in request URL or vice versa)
        matched = networkRequests.find(req => {
          const reqNorm = normalizeUrl(req.url);
          return reqNorm.includes(normalizedResource) || normalizedResource.includes(reqNorm);
        });

        return matched;
      };

      for (const element of domElements) {
        if (element.associatedResources && element.associatedResources.length > 0) {
          element.resourceTimings = [];
          let maxEndTimeMs = 0; // Track in milliseconds

          for (const resourceUrl of element.associatedResources) {
            const matchedRequest = findMatchingRequest(resourceUrl);

            if (matchedRequest) {
              element.resourceTimings.push({
                url: matchedRequest.url,
                duration: matchedRequest.duration,
                size: matchedRequest.size,
                type: matchedRequest.type
              });

              // Calculate end time in milliseconds
              const endTimeMs = matchedRequest.endTime * 1000;

              // Set element load time based on the slowest resource
              if (endTimeMs > maxEndTimeMs) {
                maxEndTimeMs = endTimeMs;
              }
            }
          }

          // Set loadTime if we found any resources
          if (maxEndTimeMs > 0) {
            element.loadTime = maxEndTimeMs;
          }
        }
      }

      return domElements;
    } catch (error) {
      console.error('Error collecting DOM elements:', error);
      return [];
    }
  }

  private async captureHTML(page: Page): Promise<string> {
    try {
      // Get the full HTML of the page after all resources have loaded
      const html = await page.content();
      return html;
    } catch (error) {
      console.error('Error capturing HTML:', error);
      return '';
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
