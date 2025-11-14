import type { AnalysisResult } from '~/types/performance';

/**
 * Export analysis result as JSON file
 */
export function exportAsJSON(result: AnalysisResult, filename?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `performance-analysis-${timestamp}.json`;
  const finalFilename = filename || defaultFilename;

  const dataStr = JSON.stringify(result, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Export analysis result as formatted text report
 */
export function exportAsTextReport(result: AnalysisResult, filename?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `performance-report-${timestamp}.txt`;
  const finalFilename = filename || defaultFilename;

  let report = '';
  report += '='.repeat(80) + '\n';
  report += 'WEB PERFORMANCE ANALYSIS REPORT\n';
  report += '='.repeat(80) + '\n\n';

  report += `URL: ${result.url}\n`;
  report += `Analysis Date: ${new Date(result.timestamp).toLocaleString()}\n`;
  report += `Total Running Time: ${result.runningTime.toFixed(0)}ms\n\n`;

  report += '-'.repeat(80) + '\n';
  report += 'PERFORMANCE SCORE\n';
  report += '-'.repeat(80) + '\n';
  report += `Overall Score: ${result.performanceScore.overall}/100\n`;
  report += `  - Metrics Score: ${result.performanceScore.metrics}/100\n`;
  report += `  - Network Score: ${result.performanceScore.network}/100\n`;
  report += `  - Frames Score: ${result.performanceScore.frames}/100\n\n`;

  report += '-'.repeat(80) + '\n';
  report += 'CORE WEB VITALS\n';
  report += '-'.repeat(80) + '\n';
  if (result.metrics.fcp)
    report += `FCP (First Contentful Paint): ${result.metrics.fcp.toFixed(0)}ms\n`;
  if (result.metrics.lcp)
    report += `LCP (Largest Contentful Paint): ${result.metrics.lcp.toFixed(0)}ms\n`;
  if (result.metrics.tbt)
    report += `TBT (Total Blocking Time): ${result.metrics.tbt.toFixed(0)}ms\n`;
  if (result.metrics.cls !== undefined)
    report += `CLS (Cumulative Layout Shift): ${result.metrics.cls.toFixed(3)}\n`;
  if (result.metrics.ttfb)
    report += `TTFB (Time to First Byte): ${result.metrics.ttfb.toFixed(0)}ms\n`;
  if (result.metrics.domContentLoaded)
    report += `DOM Content Loaded: ${result.metrics.domContentLoaded.toFixed(0)}ms\n`;
  if (result.metrics.loadComplete)
    report += `Load Complete: ${result.metrics.loadComplete.toFixed(0)}ms\n\n`;

  report += '-'.repeat(80) + '\n';
  report += 'NETWORK SUMMARY\n';
  report += '-'.repeat(80) + '\n';
  const totalSize = result.networkRequests.reduce((sum, req) => sum + req.size, 0);
  const imageCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'image').length;
  const cssCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'stylesheet').length;
  const jsCount = result.networkRequests.filter(r => r.type.toLowerCase() === 'script').length;

  report += `Total Requests: ${result.networkRequests.length}\n`;
  report += `Total Size: ${formatBytes(totalSize)}\n`;
  report += `  - Images: ${imageCount} requests\n`;
  report += `  - Stylesheets: ${cssCount} requests\n`;
  report += `  - Scripts: ${jsCount} requests\n\n`;

  if (result.longTasks && result.longTasks.length > 0) {
    report += '-'.repeat(80) + '\n';
    report += 'LONG TASKS\n';
    report += '-'.repeat(80) + '\n';
    const avgDuration =
      result.longTasks.reduce((sum, t) => sum + t.duration, 0) / result.longTasks.length;
    const maxDuration = Math.max(...result.longTasks.map(t => t.duration));
    const totalBlocking = result.longTasks.reduce(
      (sum, t) => sum + Math.max(0, t.duration - 50),
      0
    );

    report += `Total Long Tasks: ${result.longTasks.length}\n`;
    report += `Average Duration: ${avgDuration.toFixed(0)}ms\n`;
    report += `Max Duration: ${maxDuration.toFixed(0)}ms\n`;
    report += `Total Blocking Time: ${totalBlocking.toFixed(0)}ms\n\n`;

    report += 'Top 5 Longest Tasks:\n';
    const topTasks = [...result.longTasks].sort((a, b) => b.duration - a.duration).slice(0, 5);
    topTasks.forEach((task, index) => {
      report += `  ${index + 1}. ${task.name} - ${task.duration.toFixed(0)}ms (starts at ${task.startTime.toFixed(0)}ms)\n`;
    });
    report += '\n';
  }

  report += '-'.repeat(80) + '\n';
  report += 'FRAMES\n';
  report += '-'.repeat(80) + '\n';
  report += `Total Frames Captured: ${result.frames.length}\n`;
  if (result.frames.length > 1) {
    const intervals = [];
    for (let i = 1; i < result.frames.length; i++) {
      intervals.push((result.frames[i].timestamp - result.frames[i - 1].timestamp) * 1000);
    }
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    report += `Average Frame Interval: ${avgInterval.toFixed(0)}ms\n`;
  }
  report += '\n';

  report += '='.repeat(80) + '\n';
  report += 'END OF REPORT\n';
  report += '='.repeat(80) + '\n';

  const dataBlob = new Blob([report], { type: 'text/plain' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Export analysis result as CSV (network requests)
 */
export function exportNetworkAsCSV(result: AnalysisResult, filename?: string): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const defaultFilename = `network-requests-${timestamp}.csv`;
  const finalFilename = filename || defaultFilename;

  let csv = 'ID,URL,Type,Start Time (s),End Time (s),Duration (ms),Size (bytes),Status\n';

  for (const req of result.networkRequests) {
    const row = [
      req.id,
      `"${req.url}"`,
      req.type,
      req.startTime.toFixed(3),
      req.endTime.toFixed(3),
      req.duration.toFixed(2),
      req.size,
      req.status || ''
    ];
    csv += row.join(',') + '\n';
  }

  const dataBlob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(dataBlob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  link.click();

  URL.revokeObjectURL(url);
}

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Get performance grade based on score
 */
export function getPerformanceGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

/**
 * Get metric evaluation text
 */
export function getMetricEvaluation(metricName: string, value: number): string {
  switch (metricName.toLowerCase()) {
    case 'fcp':
    case 'lcp':
    case 'ttfb':
      if (value <= 1000) return 'Excellent';
      if (value <= 3000) return 'Good';
      if (value <= 7000) return 'Needs Improvement';
      return 'Poor';
    case 'tbt':
      if (value <= 200) return 'Excellent';
      if (value <= 600) return 'Good';
      return 'Needs Improvement';
    case 'cls':
      if (value <= 0.1) return 'Excellent';
      if (value <= 0.25) return 'Good';
      return 'Needs Improvement';
    default:
      return 'N/A';
  }
}
