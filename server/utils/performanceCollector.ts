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
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
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
        this.startFrameCapture(page);
      }

      // Navigate to URL without timeout for analyzing even worst-performing pages
      const waitCondition = options.waitUntil || 'networkidle2';
      logger.debug(`Navigating with NO timeout, waitUntil: ${waitCondition}`);

      await page.goto(url, {
        waitUntil: waitCondition as any,
        timeout: 0 // No timeout for worst-performing pages
      });

      // Wait for animations and late resources
      await new Promise<void>(resolve => setTimeout(resolve, 2000));

      // Collect all metrics
      const metrics = await this.collectMetrics(page);
      const longTasks = await this.collectLongTasks(page);
      const domElements = await this.collectDOMElements(page);
      const capturedHTML = await this.captureHTML(page);

      // Calculate running time
      const runningTime = Date.now() - this.startTime;

      // Convert requests map to array
      const networkRequests = this.convertRequestsToArray();

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

  private startFrameCapture(page: Page) {
    this.captureInterval = setInterval(async () => {
      try {
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
    }, 100); // Capture every 100ms
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
    const profiles = {
      'slow-3g': {
        downloadThroughput: (500 * 1024) / 8,
        uploadThroughput: (500 * 1024) / 8,
        latency: 400
      },
      'fast-3g': {
        downloadThroughput: (1.6 * 1024 * 1024) / 8,
        uploadThroughput: (750 * 1024) / 8,
        latency: 150
      },
      '4g': {
        downloadThroughput: (4 * 1024 * 1024) / 8,
        uploadThroughput: (3 * 1024 * 1024) / 8,
        latency: 20
      }
    };

    const throttling = profiles[profile as keyof typeof profiles];
    if (throttling) {
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        ...throttling
      });
    }
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

  private async collectDOMElements(page: Page): Promise<DOMElementTiming[]> {
    try {
      // Scroll to top before collecting elements to ensure accurate positions
      await page.evaluate(() => {
        window.scrollTo(0, 0);
      });

      // Wait a bit for scroll to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Collect DOM elements with their timing and position information
      const domElements = await page.evaluate(() => {
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
            if (img.src) resources.push(img.src);
          }

          // Check for background images
          const computedStyle = window.getComputedStyle(el);
          const bgImage = computedStyle.backgroundImage;
          if (bgImage && bgImage !== 'none') {
            const matches = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
            if (matches && matches[1]) resources.push(matches[1]);
          }

          // Check for video/audio sources
          if (el.tagName === 'VIDEO' || el.tagName === 'AUDIO') {
            const media = el as HTMLMediaElement;
            if (media.src) resources.push(media.src);
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

          // Limit to 1000 elements to prevent huge payloads (increased from 500 for full page)
          if (elements.length >= 1000) break;
        }

        return elements;
      });

      // Match DOM elements with network resource timings
      const networkRequests = this.convertRequestsToArray();

      for (const element of domElements) {
        if (element.associatedResources && element.associatedResources.length > 0) {
          element.resourceTimings = [];

          for (const resourceUrl of element.associatedResources) {
            const matchedRequest = networkRequests.find(req => req.url === resourceUrl);

            if (matchedRequest) {
              element.resourceTimings.push({
                url: matchedRequest.url,
                duration: matchedRequest.duration,
                size: matchedRequest.size,
                type: matchedRequest.type
              });

              // Set element load time based on the slowest resource
              if (!element.loadTime || matchedRequest.endTime > element.loadTime) {
                element.loadTime = matchedRequest.endTime * 1000; // Convert to ms
              }
            }
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
