import { getAnalysisQueue, closeAnalysisQueue } from '~/server/utils/analysisQueue';
import { LighthouseCollector } from '~/server/utils/lighthouseCollector';
import { CustomMetricsCalculator } from '~/server/utils/customMetricsCalculator';
import type { AnalysisOptions } from '~/types/performance';
import { logger } from '~/server/utils/logger';
import { createEnhancedError, formatErrorForResponse } from '~/server/utils/errorHandler';

let lighthouseCollector: LighthouseCollector | null = null;

export default defineEventHandler(async event => {
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
      viewportHeight: options?.viewportHeight ?? 1080,
      timeout: options?.timeout ?? 60000, // 60 seconds default
      screenshotInterval: options?.screenshotInterval ?? 250, // Reduced from 100ms to 250ms
      maxRenderWaitTime: options?.maxRenderWaitTime ?? 30000, // 30 seconds max wait for render completion
      renderStabilityTime: options?.renderStabilityTime ?? 1000 // 1 second of DOM stability
    };

    // Perform analysis using queue to handle concurrency
    currentStep = 'performance-analysis';
    const queue = getAnalysisQueue();
    const result = await queue.enqueue(url, analysisOptions);

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
        // Custom metrics are now calculated from the result data
        result.customMetrics = CustomMetricsCalculator.calculateMetrics(
          analysisOptions.customMetrics,
          result,
          [],
          []
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
      message: error.message,
      stack: error.stack
    });

    // Create enhanced error with user-friendly message
    const enhancedError = createEnhancedError(error, currentStep);
    const errorResponse = formatErrorForResponse(enhancedError);

    // Return structured error response instead of throwing
    return {
      ...errorResponse,
      step: currentStep
    };
  }
});

// Cleanup on server shutdown
if (process.env.NODE_ENV !== 'production') {
  process.on('SIGTERM', async () => {
    await closeAnalysisQueue();
  });
}
