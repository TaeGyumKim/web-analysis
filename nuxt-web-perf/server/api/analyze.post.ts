import { PerformanceCollector } from '~/server/utils/performanceCollector';
import { LighthouseCollector } from '~/server/utils/lighthouseCollector';
import { CustomMetricsCalculator } from '~/server/utils/customMetricsCalculator';
import type { AnalysisOptions } from '~/types/performance';

let collector: PerformanceCollector | null = null;
let lighthouseCollector: LighthouseCollector | null = null;

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { url, options } = body as { url: string; options: AnalysisOptions };

    // Validate URL
    if (!url || typeof url !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL provided'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL format'
      });
    }

    // Initialize collector if needed
    if (!collector) {
      collector = new PerformanceCollector();
      await collector.initialize();
    }

    // Set default options
    const analysisOptions: AnalysisOptions = {
      captureScreenshots: options?.captureScreenshots ?? true,
      networkThrottling: options?.networkThrottling ?? 'none',
      cpuThrottling: options?.cpuThrottling ?? 1,
      waitUntil: options?.waitUntil ?? 'networkidle0',
      useLighthouse: options?.useLighthouse ?? false,
      lighthouseFormFactor: options?.lighthouseFormFactor ?? 'desktop',
      customMetrics: options?.customMetrics ?? [],
      viewportWidth: options?.viewportWidth ?? 1920,
      viewportHeight: options?.viewportHeight ?? 1080
    };

    // Perform analysis
    const result = await collector.analyze(url, analysisOptions);

    // Perform Lighthouse analysis if requested
    if (analysisOptions.useLighthouse) {
      if (!lighthouseCollector) {
        lighthouseCollector = new LighthouseCollector();
      }

      try {
        const lighthouseResult = await lighthouseCollector.analyze({
          url,
          formFactor: analysisOptions.lighthouseFormFactor,
          throttling: analysisOptions.networkThrottling === 'none' ? 'none' :
                      analysisOptions.lighthouseFormFactor === 'mobile' ? 'mobile' : 'desktop'
        });

        result.lighthouse = lighthouseResult;
      } catch (lighthouseError) {
        console.error('Lighthouse analysis failed:', lighthouseError);
        // Continue without Lighthouse data
      }
    }

    // Calculate custom metrics if any are defined
    if (analysisOptions.customMetrics && analysisOptions.customMetrics.length > 0) {
      try {
        // Get user timing and element timing data from the collector
        const userTimingData = collector.getUserTimingData?.() || [];
        const elementTimingData = collector.getElementTimingData?.() || [];

        result.customMetrics = CustomMetricsCalculator.calculateMetrics(
          analysisOptions.customMetrics,
          result,
          userTimingData,
          elementTimingData
        );
      } catch (customMetricsError) {
        console.error('Custom metrics calculation failed:', customMetricsError);
        // Continue without custom metrics
      }
    }

    return {
      success: true,
      data: result
    };

  } catch (error: any) {
    console.error('Analysis error:', error);

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to analyze page performance'
    });
  }
});

// Cleanup on server shutdown
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGTERM', async () => {
    if (collector) {
      await collector.close();
    }
  });
}
