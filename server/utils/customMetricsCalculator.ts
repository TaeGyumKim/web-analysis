import type {
  CustomMetricDefinition,
  CustomMetricResult,
  AnalysisResult
} from '~/types/performance';

export class CustomMetricsCalculator {
  /**
   * Calculate custom metrics based on analysis result
   */
  static calculateMetrics(
    definitions: CustomMetricDefinition[],
    result: AnalysisResult,
    userTimingData: PerformanceEntry[] = [],
    elementTimingData: PerformanceEntry[] = []
  ): CustomMetricResult[] {
    const results: CustomMetricResult[] = [];

    for (const def of definitions) {
      if (!def.enabled) continue;

      try {
        let value: number | null = null;

        switch (def.type) {
          case 'user-timing':
            value = this.calculateUserTiming(def, userTimingData);
            break;
          case 'element-timing':
            value = this.calculateElementTiming(def, elementTimingData);
            break;
          case 'calculated':
            value = this.calculateFormula(def, result);
            break;
        }

        if (value !== null && !isNaN(value)) {
          const metricResult = this.createMetricResult(def, value);
          results.push(metricResult);
        }
      } catch (error) {
        console.error(`Failed to calculate custom metric ${def.name}:`, error);
      }
    }

    return results;
  }

  /**
   * Calculate User Timing API metrics
   */
  private static calculateUserTiming(
    def: CustomMetricDefinition,
    userTimingData: PerformanceEntry[]
  ): number | null {
    if (def.measureName) {
      const measure = userTimingData.find(
        entry => entry.entryType === 'measure' && entry.name === def.measureName
      );
      if (measure) {
        return measure.duration;
      }
    }

    if (def.markName) {
      const mark = userTimingData.find(
        entry => entry.entryType === 'mark' && entry.name === def.markName
      );
      if (mark) {
        return mark.startTime;
      }
    }

    return null;
  }

  /**
   * Calculate Element Timing metrics
   */
  private static calculateElementTiming(
    def: CustomMetricDefinition,
    elementTimingData: PerformanceEntry[]
  ): number | null {
    if (!def.elementSelector) return null;

    // Element timing data would contain the render time of elements
    // This is a simplified implementation
    const element = elementTimingData.find(
      entry => entry.entryType === 'element' &&
               (entry as any).identifier === def.elementSelector
    );

    if (element) {
      return (element as any).renderTime || element.startTime;
    }

    return null;
  }

  /**
   * Calculate metrics from formulas
   */
  private static calculateFormula(
    def: CustomMetricDefinition,
    result: AnalysisResult
  ): number | null {
    if (!def.formula) return null;

    try {
      // Create a safe evaluation context
      const context: Record<string, any> = {
        // Core Web Vitals
        fcp: result.metrics.fcp || 0,
        lcp: result.metrics.lcp || 0,
        tbt: result.metrics.tbt || 0,
        cls: result.metrics.cls || 0,
        fid: result.metrics.fid || 0,
        ttfb: result.metrics.ttfb || 0,

        // Loading metrics
        domContentLoaded: result.metrics.domContentLoaded || 0,
        loadComplete: result.metrics.loadComplete || 0,

        // Network metrics
        networkRequestsLength: result.networkRequests.length,
        totalSize: result.networkRequests.reduce((sum, req) => sum + req.size, 0),

        // Long tasks
        longTasksLength: result.longTasks?.length || 0,
        totalBlockingTime: result.metrics.tbt || 0,

        // Helper functions
        networkRequests: {
          length: result.networkRequests.length,
          filter: (type: string) => result.networkRequests.filter(r =>
            r.type.toLowerCase() === type.toLowerCase()
          )
        }
      };

      // Simple formula evaluation (safe subset)
      // Replace variable names in formula with context values
      let evalFormula = def.formula;

      // Handle simple expressions
      if (evalFormula === 'networkRequests.length') {
        return context.networkRequestsLength;
      }
      if (evalFormula === 'longTasks.length') {
        return context.longTasksLength;
      }
      if (evalFormula === 'totalSize') {
        return context.totalSize;
      }

      // Handle arithmetic operations
      evalFormula = evalFormula
        .replace(/\bfcp\b/g, String(context.fcp))
        .replace(/\blcp\b/g, String(context.lcp))
        .replace(/\btbt\b/g, String(context.tbt))
        .replace(/\bcls\b/g, String(context.cls))
        .replace(/\bfid\b/g, String(context.fid))
        .replace(/\bttfb\b/g, String(context.ttfb))
        .replace(/\bdomContentLoaded\b/g, String(context.domContentLoaded))
        .replace(/\bloadComplete\b/g, String(context.loadComplete))
        .replace(/\bnetworkRequests\.length\b/g, String(context.networkRequestsLength))
        .replace(/\blongTasks\.length\b/g, String(context.longTasksLength))
        .replace(/\btotalSize\b/g, String(context.totalSize));

      // Only allow safe mathematical operations
      if (!/^[\d\s+\-*/.()]+$/.test(evalFormula)) {
        console.warn(`Unsafe formula detected: ${def.formula}`);
        return null;
      }

      // Evaluate the formula
      const result_value = Function(`"use strict"; return (${evalFormula})`)();
      return typeof result_value === 'number' ? result_value : null;

    } catch (error) {
      console.error(`Failed to evaluate formula "${def.formula}":`, error);
      return null;
    }
  }

  /**
   * Create a metric result with score and status
   */
  private static createMetricResult(
    def: CustomMetricDefinition,
    value: number
  ): CustomMetricResult {
    // Calculate score (0-100) based on thresholds
    let score: number;
    let status: 'good' | 'needs-improvement' | 'poor';

    if (value <= def.thresholds.good) {
      score = 100;
      status = 'good';
    } else if (value <= def.thresholds.needsImprovement) {
      // Linear interpolation between good and needs improvement
      const range = def.thresholds.needsImprovement - def.thresholds.good;
      const position = value - def.thresholds.good;
      score = Math.max(50, 100 - (position / range) * 50);
      status = 'needs-improvement';
    } else {
      // Linear interpolation for poor range
      const range = def.thresholds.needsImprovement;
      const position = Math.min(value - def.thresholds.needsImprovement, range);
      score = Math.max(0, 50 - (position / range) * 50);
      status = 'poor';
    }

    return {
      id: def.id,
      name: def.name,
      value,
      unit: def.unit,
      score: Math.round(score),
      status,
      timestamp: Date.now()
    };
  }
}
