import type { AnalysisResult } from '~/types/performance';

export interface HistoryEntry {
  id: string;
  url: string;
  timestamp: number;
  result: AnalysisResult;
}

const STORAGE_KEY = 'performance-analysis-history';
const MAX_HISTORY_ITEMS = 50;

/**
 * Save analysis result to history
 */
export function saveToHistory(result: AnalysisResult): void {
  if (typeof window === 'undefined') return;

  const history = getHistory();
  const entry: HistoryEntry = {
    id: `${result.url}-${result.timestamp}`,
    url: result.url,
    timestamp: result.timestamp,
    result
  };

  // Add to beginning of array
  history.unshift(entry);

  // Keep only MAX_HISTORY_ITEMS
  if (history.length > MAX_HISTORY_ITEMS) {
    history.splice(MAX_HISTORY_ITEMS);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

/**
 * Get all history entries
 */
export function getHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

/**
 * Get history entries for a specific URL
 */
export function getHistoryByUrl(url: string): HistoryEntry[] {
  const history = getHistory();
  return history.filter(entry => entry.url === url);
}

/**
 * Get unique URLs from history
 */
export function getUniqueUrls(): string[] {
  const history = getHistory();
  const urls = new Set<string>();
  history.forEach(entry => urls.add(entry.url));
  return Array.from(urls);
}

/**
 * Delete a history entry by ID
 */
export function deleteHistoryEntry(id: string): void {
  if (typeof window === 'undefined') return;

  const history = getHistory();
  const filtered = history.filter(entry => entry.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get trend data for a specific URL
 */
export function getTrendData(url: string, metricKey: keyof PerformanceMetrics): number[] {
  const entries = getHistoryByUrl(url);
  return entries
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(entry => entry.result.metrics[metricKey] as number)
    .filter(value => value !== undefined && value !== null);
}

/**
 * Get comparison data between two analysis results
 */
export function getComparisonData(result1: AnalysisResult, result2: AnalysisResult) {
  const metrics = ['fcp', 'lcp', 'tbt', 'cls', 'ttfb'] as const;

  const comparison: Record<string, { current: number; previous: number; change: number; changePercent: number }> = {};

  for (const metric of metrics) {
    const current = result1.metrics[metric];
    const previous = result2.metrics[metric];

    if (current !== undefined && previous !== undefined) {
      const change = current - previous;
      const changePercent = previous !== 0 ? (change / previous) * 100 : 0;

      comparison[metric] = {
        current,
        previous,
        change,
        changePercent
      };
    }
  }

  return comparison;
}

/**
 * Calculate average metrics across history entries
 */
export function calculateAverageMetrics(entries: HistoryEntry[]) {
  if (entries.length === 0) return null;

  const sums = {
    fcp: 0,
    lcp: 0,
    tbt: 0,
    cls: 0,
    ttfb: 0,
    overall: 0
  };

  const counts = {
    fcp: 0,
    lcp: 0,
    tbt: 0,
    cls: 0,
    ttfb: 0,
    overall: 0
  };

  for (const entry of entries) {
    if (entry.result.metrics.fcp) {
      sums.fcp += entry.result.metrics.fcp;
      counts.fcp++;
    }
    if (entry.result.metrics.lcp) {
      sums.lcp += entry.result.metrics.lcp;
      counts.lcp++;
    }
    if (entry.result.metrics.tbt) {
      sums.tbt += entry.result.metrics.tbt;
      counts.tbt++;
    }
    if (entry.result.metrics.cls !== undefined) {
      sums.cls += entry.result.metrics.cls;
      counts.cls++;
    }
    if (entry.result.metrics.ttfb) {
      sums.ttfb += entry.result.metrics.ttfb;
      counts.ttfb++;
    }
    if (entry.result.performanceScore.overall) {
      sums.overall += entry.result.performanceScore.overall;
      counts.overall++;
    }
  }

  return {
    fcp: counts.fcp > 0 ? sums.fcp / counts.fcp : undefined,
    lcp: counts.lcp > 0 ? sums.lcp / counts.lcp : undefined,
    tbt: counts.tbt > 0 ? sums.tbt / counts.tbt : undefined,
    cls: counts.cls > 0 ? sums.cls / counts.cls : undefined,
    ttfb: counts.ttfb > 0 ? sums.ttfb / counts.ttfb : undefined,
    overall: counts.overall > 0 ? sums.overall / counts.overall : undefined
  };
}

import type { PerformanceMetrics } from '~/types/performance';
