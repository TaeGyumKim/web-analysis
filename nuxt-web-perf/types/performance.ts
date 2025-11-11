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
  fcp?: number;  // First Contentful Paint
  lcp?: number;  // Largest Contentful Paint
  tbt?: number;  // Total Blocking Time
  cls?: number;  // Cumulative Layout Shift
  fid?: number;  // First Input Delay
  ttfb?: number; // Time to First Byte
  domContentLoaded?: number;
  loadComplete?: number;
}

export interface FrameCapture {
  timestamp: number;
  screenshot: string;  // base64 encoded
  metadata?: {
    visibleElements?: number;
    domNodes?: number;
  };
}

export interface LongTask {
  name: string;
  startTime: number;  // ms
  duration: number;   // ms
  attribution?: string;
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

export interface AnalysisResult {
  url: string;
  timestamp: number;
  runningTime: number;
  metrics: PerformanceMetrics;
  networkRequests: NetworkRequest[];
  frames: FrameCapture[];
  longTasks: LongTask[];
  performanceScore: PerformanceScore;
}

export interface AnalysisOptions {
  captureScreenshots: boolean;
  networkThrottling?: 'none' | 'slow-3g' | 'fast-3g' | '4g';
  cpuThrottling?: number;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
}
