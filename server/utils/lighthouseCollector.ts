import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import puppeteer from 'puppeteer';

export interface LighthouseConfig {
  url: string;
  formFactor?: 'mobile' | 'desktop';
  throttling?: 'mobile' | 'desktop' | 'none';
}

export interface LighthouseScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa: number;
}

export interface LighthouseMetrics {
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  totalBlockingTime: number;
  cumulativeLayoutShift: number;
  speedIndex: number;
  timeToInteractive: number;
  firstMeaningfulPaint: number;
}

export interface LighthouseOpportunity {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue?: string;
  details?: any;
}

export interface LighthouseDiagnostic {
  id: string;
  title: string;
  description: string;
  score: number;
  displayValue?: string;
}

export interface LighthouseResult {
  scores: LighthouseScore;
  metrics: LighthouseMetrics;
  opportunities: LighthouseOpportunity[];
  diagnostics: LighthouseDiagnostic[];
  fetchTime: number;
}

export class LighthouseCollector {
  async analyze(config: LighthouseConfig): Promise<LighthouseResult> {
    // Use Puppeteer's bundled Chromium to avoid "No Chrome installations found" error
    const chromePath = puppeteer.executablePath();

    const chrome = await launch({
      chromePath,
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage']
    });

    try {
      const options = {
        logLevel: 'error' as const,
        output: 'json' as const,
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
        port: chrome.port,
        formFactor: config.formFactor || 'desktop',
        throttling: this.getThrottlingConfig(config.throttling || 'none'),
        screenEmulation:
          config.formFactor === 'mobile'
            ? {
                mobile: true,
                width: 375,
                height: 667,
                deviceScaleFactor: 2,
                disabled: false
              }
            : {
                mobile: false,
                width: 1920,
                height: 1080,
                deviceScaleFactor: 1,
                disabled: false
              }
      };

      const runnerResult = await lighthouse(config.url, options);

      if (!runnerResult || !runnerResult.lhr) {
        throw new Error('Lighthouse analysis failed');
      }

      const lhr = runnerResult.lhr;

      // Extract scores
      const scores: LighthouseScore = {
        performance: Math.round((lhr.categories.performance?.score || 0) * 100),
        accessibility: Math.round((lhr.categories.accessibility?.score || 0) * 100),
        bestPractices: Math.round((lhr.categories['best-practices']?.score || 0) * 100),
        seo: Math.round((lhr.categories.seo?.score || 0) * 100),
        pwa: Math.round((lhr.categories.pwa?.score || 0) * 100)
      };

      // Extract metrics
      const audits = lhr.audits;
      const metrics: LighthouseMetrics = {
        firstContentfulPaint: audits['first-contentful-paint']?.numericValue || 0,
        largestContentfulPaint: audits['largest-contentful-paint']?.numericValue || 0,
        totalBlockingTime: audits['total-blocking-time']?.numericValue || 0,
        cumulativeLayoutShift: audits['cumulative-layout-shift']?.numericValue || 0,
        speedIndex: audits['speed-index']?.numericValue || 0,
        timeToInteractive: audits['interactive']?.numericValue || 0,
        firstMeaningfulPaint: audits['first-meaningful-paint']?.numericValue || 0
      };

      // Extract opportunities (performance improvements)
      const opportunities: LighthouseOpportunity[] = [];
      const performanceAudits = lhr.categories.performance?.auditRefs || [];

      for (const auditRef of performanceAudits) {
        const audit = audits[auditRef.id];
        if (
          audit &&
          audit.details &&
          audit.details.type === 'opportunity' &&
          audit.score !== null &&
          audit.score < 1
        ) {
          opportunities.push({
            id: audit.id,
            title: audit.title,
            description: audit.description,
            score: Math.round((audit.score || 0) * 100),
            displayValue: audit.displayValue,
            details: audit.details
          });
        }
      }

      // Extract diagnostics
      const diagnostics: LighthouseDiagnostic[] = [];
      for (const auditRef of performanceAudits) {
        const audit = audits[auditRef.id];
        if (
          audit &&
          audit.details &&
          audit.details.type === 'debugdata' &&
          audit.score !== null &&
          audit.score < 1
        ) {
          diagnostics.push({
            id: audit.id,
            title: audit.title,
            description: audit.description,
            score: Math.round((audit.score || 0) * 100),
            displayValue: audit.displayValue
          });
        }
      }

      return {
        scores,
        metrics,
        opportunities: opportunities.slice(0, 10), // Top 10 opportunities
        diagnostics: diagnostics.slice(0, 10), // Top 10 diagnostics
        fetchTime: lhr.fetchTime
      };
    } finally {
      await chrome.kill();
    }
  }

  private getThrottlingConfig(type: 'mobile' | 'desktop' | 'none') {
    switch (type) {
      case 'mobile':
        return {
          rttMs: 150,
          throughputKbps: 1.6 * 1024,
          requestLatencyMs: 150,
          downloadThroughputKbps: 1.6 * 1024,
          uploadThroughputKbps: 750,
          cpuSlowdownMultiplier: 4
        };
      case 'desktop':
        return {
          rttMs: 40,
          throughputKbps: 10 * 1024,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
          cpuSlowdownMultiplier: 1
        };
      case 'none':
      default:
        return {
          rttMs: 0,
          throughputKbps: 0,
          requestLatencyMs: 0,
          downloadThroughputKbps: 0,
          uploadThroughputKbps: 0,
          cpuSlowdownMultiplier: 1
        };
    }
  }
}
