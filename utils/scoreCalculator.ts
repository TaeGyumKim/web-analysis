import type { PerformanceMetrics, NetworkRequest, FrameCapture, PerformanceScore, ScoreDetail } from '~/types/performance';

// Weight constants
const PERF_WEIGHT_METRICS = 0.5;
const PERF_WEIGHT_NETWORK = 0.35;
const PERF_WEIGHT_FRAMES = 0.15;

// Metric weights (should sum to 1.0)
const METRIC_WEIGHTS: Record<string, number> = {
  fcp: 0.28,
  lcp: 0.28,
  tbt: 0.18,
  cls: 0.12,
  ttfb: 0.14
};

/**
 * Score timing metric based on milliseconds (0-100, higher is better)
 * Based on the C# implementation's ScoreTimingMs method
 */
export function scoreTimingMs(ms: number | undefined): number {
  if (ms === undefined || ms === null || isNaN(ms) || ms <= 0) {
    return 100; // Neutral score for invalid/missing data
  }

  if (ms <= 1000) {
    return 100;
  } else if (ms <= 3000) {
    // Linear decrease from 100 to 75
    return 100 - ((ms - 1000) * (25 / 2000));
  } else if (ms <= 7000) {
    // Linear decrease from 75 to 30
    return 75 - ((ms - 3000) * (45 / 4000));
  } else {
    // Slow decrease: -1 per second
    return Math.max(0, 30 - ((ms - 7000) / 1000));
  }
}

/**
 * Score CLS (Cumulative Layout Shift) metric (0-100, higher is better)
 * CLS is a score from 0 to infinity (typically 0-1 for good pages)
 * Based on Web Vitals thresholds
 */
export function scoreCLS(cls: number | undefined): number {
  if (cls === undefined || cls === null || isNaN(cls)) {
    return 100; // Neutral score for invalid/missing data
  }

  // Web Vitals thresholds:
  // Good: ≤ 0.1
  // Needs improvement: 0.1 - 0.25
  // Poor: > 0.25

  if (cls <= 0.1) {
    return 100;
  } else if (cls <= 0.25) {
    // Linear decrease from 100 to 50
    return 100 - ((cls - 0.1) * (50 / 0.15));
  } else if (cls <= 0.5) {
    // Linear decrease from 50 to 20
    return 50 - ((cls - 0.25) * (30 / 0.25));
  } else {
    // Slow decrease
    return Math.max(0, 20 - ((cls - 0.5) * 10));
  }
}

/**
 * Calculate metrics score (weighted average of individual metrics)
 */
export function computeMetricsScore(metrics: PerformanceMetrics): { score: number; details: ScoreDetail[] } {
  const details: ScoreDetail[] = [];
  let totalWeight = 0;
  let weightedSum = 0;

  // Calculate score for each available metric
  for (const [key, weight] of Object.entries(METRIC_WEIGHTS)) {
    const value = metrics[key as keyof PerformanceMetrics];
    if (value !== undefined && value !== null) {
      // Use appropriate scoring function based on metric type
      const score = key === 'cls' ? scoreCLS(value) : scoreTimingMs(value);
      details.push({
        name: key.toUpperCase(),
        value,
        score,
        weight
      });
      weightedSum += score * weight;
      totalWeight += weight;
    }
  }

  // Normalize if not all metrics are available
  const metricsScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 100;

  return { score: metricsScore, details };
}

/**
 * Calculate network score based on total bytes, request count, and longest request
 */
export function computeNetworkScore(requests: NetworkRequest[]): { score: number; details: ScoreDetail[] } {
  if (!requests || requests.length === 0) {
    return { score: 100, details: [] };
  }

  const totalBytes = requests.reduce((sum, req) => sum + (req.size || 0), 0);
  const reqCount = requests.length;
  const longestMs = Math.max(...requests.map(req => req.duration || 0));

  const mb = totalBytes / (1024 * 1024);

  let penalty = 0;

  // Penalty for large total size
  if (mb > 5) {
    penalty += Math.min(30, (mb - 5) * 3);
  }

  // Penalty for too many requests
  if (reqCount > 40) {
    penalty += Math.min(25, (reqCount - 40) * 0.8);
  }

  // Penalty for long requests
  if (longestMs > 2000) {
    penalty += Math.min(30, ((longestMs - 2000) / 500) * 3);
  }

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));

  const details: ScoreDetail[] = [
    {
      name: 'Total Size',
      value: totalBytes,
      score: mb <= 5 ? 100 : Math.max(0, 100 - (mb - 5) * 10),
      weight: 0.33
    },
    {
      name: 'Request Count',
      value: reqCount,
      score: reqCount <= 40 ? 100 : Math.max(0, 100 - (reqCount - 40) * 2),
      weight: 0.33
    },
    {
      name: 'Longest Request',
      value: longestMs,
      score: scoreTimingMs(longestMs),
      weight: 0.34
    }
  ];

  return { score, details };
}

/**
 * Calculate frames score based on frame interval consistency
 */
export function computeFramesScore(frames: FrameCapture[]): { score: number; details: ScoreDetail[] } {
  if (!frames || frames.length < 2) {
    return { score: 100, details: [] };
  }

  const intervals: number[] = [];
  for (let i = 1; i < frames.length; i++) {
    intervals.push((frames[i].timestamp - frames[i - 1].timestamp) * 1000); // Convert to ms
  }

  const avg = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
  const sorted = [...intervals].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let score: number;
  if (avg <= 100) {
    score = 100;
  } else if (avg <= 200) {
    score = 90;
  } else if (avg <= 400) {
    score = 75;
  } else {
    score = 60;
  }

  const details: ScoreDetail[] = [
    {
      name: 'Average Frame Interval',
      value: avg,
      score,
      weight: 0.6
    },
    {
      name: 'Median Frame Interval',
      value: median,
      score,
      weight: 0.4
    }
  ];

  return { score, details };
}

/**
 * Calculate overall performance score
 */
export function computePerformanceScore(
  metrics: PerformanceMetrics,
  requests: NetworkRequest[],
  frames: FrameCapture[]
): PerformanceScore {
  const metricsResult = computeMetricsScore(metrics);
  const networkResult = computeNetworkScore(requests);
  const framesResult = computeFramesScore(frames);

  const overall = Math.round(
    metricsResult.score * PERF_WEIGHT_METRICS +
    networkResult.score * PERF_WEIGHT_NETWORK +
    framesResult.score * PERF_WEIGHT_FRAMES
  );

  const details: ScoreDetail[] = [
    {
      name: 'Metrics Score',
      value: metricsResult.score,
      score: metricsResult.score,
      weight: PERF_WEIGHT_METRICS
    },
    {
      name: 'Network Score',
      value: networkResult.score,
      score: networkResult.score,
      weight: PERF_WEIGHT_NETWORK
    },
    {
      name: 'Frames Score',
      value: framesResult.score,
      score: framesResult.score,
      weight: PERF_WEIGHT_FRAMES
    },
    ...metricsResult.details,
    ...networkResult.details,
    ...framesResult.details
  ];

  return {
    overall: Math.max(0, Math.min(100, overall)),
    metrics: metricsResult.score,
    network: networkResult.score,
    frames: framesResult.score,
    details
  };
}

/**
 * Get score color class based on score value
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * Get score badge class based on score value
 */
export function getScoreBadgeClass(score: number): string {
  if (score >= 90) return 'badge-success';
  if (score >= 50) return 'badge-warning';
  return 'badge-danger';
}
