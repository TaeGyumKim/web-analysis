export interface NetworkRequest {
  id: string;
  url: string;
  type: string;
  startTime: number;
  endTime: number;
  duration: number;
  size: number;
  status?: number;
}

export interface PerformanceMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  tbt?: number; // Total Blocking Time
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
}

export interface FrameCapture {
  timestamp: number;
  screenshot: string; // base64 encoded
  metadata?: {
    visibleElements?: number;
    domNodes?: number;
  };
}

export interface LongTask {
  name: string;
  startTime: number; // ms
  duration: number; // ms
  attribution?: string;
}

export interface DOMElementTiming {
  selector: string; // CSS selector
  tagName: string;
  className?: string;
  id?: string;
  innerText?: string; // First 50 chars
  renderTime?: number; // When element appeared in DOM
  paintTime?: number; // When element was painted
  loadTime?: number; // When associated resources loaded
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  associatedResources?: string[]; // URLs of images, backgrounds, etc.
  resourceTimings?: {
    url: string;
    duration: number;
    size: number;
    type: string;
  }[];
}

export interface LighthouseScore {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  pwa?: number; // Optional: PWA is not available in Lighthouse v13+
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

export interface PerformanceScore {
  overall: number;
  metrics: number;
  network: number;
  frames: number;
  details: ScoreDetail[];
}

export interface ScoreDetail {
  name: string;
  value: number;
  score: number;
  weight: number;
}

export interface CustomMetricDefinition {
  id: string;
  name: string;
  description: string;
  type: 'user-timing' | 'element-timing' | 'calculated';
  // For user-timing: mark name or measure name
  markName?: string;
  measureName?: string;
  // For element-timing: element selector
  elementSelector?: string;
  // For calculated: formula based on existing metrics
  formula?: string; // e.g., "lcp - fcp", "networkRequests.length", etc.
  // Thresholds
  thresholds: {
    good: number;
    needsImprovement: number;
    poor: number;
  };
  unit: 'ms' | 's' | 'score' | 'bytes' | 'count';
  enabled: boolean;
}

export interface CustomMetricResult {
  id: string;
  name: string;
  value: number;
  unit: string;
  score: number; // 0-100 based on thresholds
  status: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

export interface AnalysisResult {
  url: string;
  timestamp: number;
  runningTime: number;
  metrics: PerformanceMetrics;
  networkRequests: NetworkRequest[];
  frames: FrameCapture[];
  longTasks: LongTask[];
  performanceScore: PerformanceScore;
  lighthouse?: LighthouseResult;
  customMetrics?: CustomMetricResult[];
  options?: AnalysisOptions; // Analysis options used for this result
  domElements?: DOMElementTiming[]; // DOM elements with loading timing
  capturedHTML?: string; // Full HTML snapshot for interactive inspection
}

export interface AnalysisOptions {
  captureScreenshots: boolean;
  networkThrottling?: 'none' | 'lte-network' | '5mbps-lte' | '3mbps-lte' | '1mbps-lte' | '400kbps-lte';
  cpuThrottling?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
  useLighthouse?: boolean;
  lighthouseFormFactor?: 'mobile' | 'desktop';
  customMetrics?: CustomMetricDefinition[];
  viewportWidth?: number;
  viewportHeight?: number;
  timeout?: number; // Page load timeout in milliseconds (default: 60000)
  screenshotInterval?: number; // Screenshot capture interval in milliseconds (default: 100)
  maxRenderWaitTime?: number; // Maximum time to wait for render completion in ms (default: 30000)
  renderStabilityTime?: number; // Time without DOM changes to consider render complete in ms (default: 1000)
}
