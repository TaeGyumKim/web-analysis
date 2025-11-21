/**
 * Constants and thresholds for web performance analysis
 * Centralized configuration to maintain consistency across the application
 */

/**
 * Performance Metric Thresholds
 * Based on Web Vitals recommendations
 * @see https://web.dev/vitals/
 */
export const PERFORMANCE_THRESHOLDS = {
  // First Contentful Paint (ms)
  fcp: {
    good: 1800,
    needsImprovement: 3000,
    poor: 3000
  },
  // Largest Contentful Paint (ms)
  lcp: {
    good: 2500,
    needsImprovement: 4000,
    poor: 4000
  },
  // Total Blocking Time (ms)
  tbt: {
    good: 200,
    needsImprovement: 600,
    poor: 600
  },
  // Cumulative Layout Shift (score)
  cls: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: 0.25
  },
  // First Input Delay (ms)
  fid: {
    good: 100,
    needsImprovement: 300,
    poor: 300
  },
  // Time to First Byte (ms)
  ttfb: {
    good: 800,
    needsImprovement: 1800,
    poor: 1800
  },
  // Speed Index (ms)
  speedIndex: {
    good: 3400,
    needsImprovement: 5800,
    poor: 5800
  },
  // Time to Interactive (ms)
  tti: {
    good: 3800,
    needsImprovement: 7300,
    poor: 7300
  }
} as const;

/**
 * Score color mapping for visualization
 */
export const SCORE_COLORS = {
  good: {
    hex: '#0cce6b',
    rgb: 'rgb(12, 206, 107)',
    rgba: 'rgba(12, 206, 107, 0.8)'
  },
  needsImprovement: {
    hex: '#ffa400',
    rgb: 'rgb(255, 164, 0)',
    rgba: 'rgba(255, 164, 0, 0.8)'
  },
  poor: {
    hex: '#ff4e42',
    rgb: 'rgb(255, 78, 66)',
    rgba: 'rgba(255, 78, 66, 0.8)'
  }
} as const;

/**
 * Score ranges for overall performance scoring
 */
export const SCORE_RANGES = {
  good: 90,
  needsImprovement: 50,
  poor: 0
} as const;

/**
 * Default analysis options
 */
export const DEFAULT_ANALYSIS_OPTIONS = {
  timeout: 60000, // 60 seconds
  screenshotInterval: 250, // 250ms
  captureScreenshots: true,
  networkThrottling: 'none' as const,
  cpuThrottling: 1,
  waitUntil: 'networkidle0' as const,
  useLighthouse: false,
  lighthouseFormFactor: 'desktop' as const,
  viewportWidth: 1920,
  viewportHeight: 1080
} as const;

/**
 * Network throttling profiles (bytes per second)
 */
export const NETWORK_PROFILES = {
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
} as const;

/**
 * Analysis queue configuration
 */
export const QUEUE_CONFIG = {
  maxRetries: 3,
  retryDelayBase: 1000 // Base delay in ms, will be multiplied by retry count
} as const;

/**
 * Resource limits
 */
export const RESOURCE_LIMITS = {
  maxDOMElements: 1000,
  maxHistoryEntries: 100,
  maxScreenshots: 100
} as const;

/**
 * Helper function to get metric status based on value
 */
export function getMetricStatus(
  metric: keyof typeof PERFORMANCE_THRESHOLDS,
  value: number
): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = PERFORMANCE_THRESHOLDS[metric];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Helper function to get color for a metric value
 */
export function getMetricColor(metric: keyof typeof PERFORMANCE_THRESHOLDS, value: number): string {
  const status = getMetricStatus(metric, value);
  return SCORE_COLORS[status].hex;
}

/**
 * Note: getScoreStatus() and getScoreColor() functions are available in utils/scoreCalculator.ts
 * to avoid duplication and maintain single source of truth.
 */
