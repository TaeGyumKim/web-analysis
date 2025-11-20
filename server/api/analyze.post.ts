import { PerformanceCollector } from '~/server/utils/performanceCollector';
import { LighthouseCollector } from '~/server/utils/lighthouseCollector';
import { CustomMetricsCalculator } from '~/server/utils/customMetricsCalculator';
import type { AnalysisOptions } from '~/types/performance';
import { logger } from '~/server/utils/logger';

let collector: PerformanceCollector | null = null;
let lighthouseCollector: LighthouseCollector | null = null;

export default defineEventHandler(async event => {
  const startTime = Date.now();
  let currentStep = 'initialization';

  try {
    const body = await readBody(event);
    const { url, options } = body as { url: string; options: AnalysisOptions };

    // Validate URL
    currentStep = 'url-validation';
    if (!url || typeof url !== 'string') {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL provided'
      });
    }

    try {
      new URL(url);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL format'
      });
    }

    // Initialize collector if needed
    currentStep = 'collector-initialization';
    if (!collector) {
      logger.debug('Initializing PerformanceCollector');
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
    currentStep = 'performance-analysis';
    const result = await collector.analyze(url, analysisOptions);

    // Perform Lighthouse analysis if requested
    if (analysisOptions.useLighthouse) {
      currentStep = 'lighthouse-analysis';
      if (!lighthouseCollector) {
        lighthouseCollector = new LighthouseCollector();
      }

      try {
        const lighthouseResult = await lighthouseCollector.analyze({
          url,
          formFactor: analysisOptions.lighthouseFormFactor,
          throttling:
            analysisOptions.networkThrottling === 'none'
              ? 'none'
              : analysisOptions.lighthouseFormFactor === 'mobile'
                ? 'mobile'
                : 'desktop'
        });

        result.lighthouse = lighthouseResult;
      } catch (lighthouseError) {
        logger.error('Lighthouse analysis failed:', lighthouseError);
      }
    }

    // Calculate custom metrics if any are defined
    if (analysisOptions.customMetrics && analysisOptions.customMetrics.length > 0) {
      currentStep = 'custom-metrics';
      try {
        const userTimingData = collector.getUserTimingData?.() || [];
        const elementTimingData = collector.getElementTimingData?.() || [];

        result.customMetrics = CustomMetricsCalculator.calculateMetrics(
          analysisOptions.customMetrics,
          result,
          userTimingData,
          elementTimingData
        );
      } catch (customMetricsError) {
        logger.error('Custom metrics calculation failed:', customMetricsError);
      }
    }

    result.options = analysisOptions;

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    logger.error(`Analysis failed at ${currentStep}:`, {
      url: error.url,
      message: error.message,
      stack: error.stack
    });

    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: `Failed at ${currentStep}: ${error.message || 'Unknown error'}`
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
