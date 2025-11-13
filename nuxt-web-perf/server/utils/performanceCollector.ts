import puppeteer, { Browser, Page, CDPSession } from 'puppeteer';
import type {
  NetworkRequest,
  PerformanceMetrics,
  FrameCapture,
  LongTask,
  AnalysisResult,
  AnalysisOptions
} from '~/types/performance';

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

      // Set up network monitoring
      this.setupNetworkMonitoring(client);

      // Set up frame capture
      if (options.captureScreenshots) {
        this.startFrameCapture(page);
      }

      // Navigate to URL
      const navigationStart = Date.now();
      await page.goto(url, {
        waitUntil: options.waitUntil || 'networkidle0',
        timeout: 60000
      });

      // Wait a bit more for animations and late resources
      await new Promise<void>(resolve => setTimeout(resolve, 2000));

      // Collect performance metrics
      const metrics = await this.collectMetrics(page, client);

      // Collect long tasks
      const longTasks = await this.collectLongTasks(page);

      // Stop frame capture
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
      }

      // Calculate running time
      const runningTime = Date.now() - this.startTime;

      // Convert requests map to array
      const networkRequests = this.convertRequestsToArray();

      // Calculate performance score
      const performanceScore = await import('~/utils/scoreCalculator').then(m =>
        m.computePerformanceScore(metrics, networkRequests, this.frames)
      );

      await page.close();

      return {
        url,
        timestamp: this.startTime,
        runningTime,
        metrics,
        networkRequests,
        frames: this.frames,
        longTasks,
        performanceScore
      };

    } catch (error) {
      await page.close();
      throw error;
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
          type: 'png'
        });
        const timestamp = (Date.now() - this.startTime) / 1000;

        this.frames.push({
          timestamp,
          screenshot: screenshot as string
        });
      } catch (error) {
        console.error('Failed to capture frame:', error);
      }
    }, 100); // Capture every 100ms
  }

  private async collectMetrics(page: Page, client: CDPSession): Promise<PerformanceMetrics> {
    // Inject performance collection script
    const rawMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
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
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          metrics.lcp = lastEntry.renderTime || lastEntry.loadTime;
        });

        // Observer for CLS
        const clsObserver = new PerformanceObserver((list) => {
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
          } catch (e) {
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
        } catch (e) {
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
        downloadThroughput: 500 * 1024 / 8,
        uploadThroughput: 500 * 1024 / 8,
        latency: 400
      },
      'fast-3g': {
        downloadThroughput: 1.6 * 1024 * 1024 / 8,
        uploadThroughput: 750 * 1024 / 8,
        latency: 150
      },
      '4g': {
        downloadThroughput: 4 * 1024 * 1024 / 8,
        uploadThroughput: 3 * 1024 * 1024 / 8,
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

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
