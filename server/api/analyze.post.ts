import { PerformanceCollector } from '~/server/utils/performanceCollector';
import { LighthouseCollector } from '~/server/utils/lighthouseCollector';
import { CustomMetricsCalculator } from '~/server/utils/customMetricsCalculator';
import type { AnalysisOptions } from '~/types/performance';

let collector: PerformanceCollector | null = null;
let lighthouseCollector: LighthouseCollector | null = null;

export default defineEventHandler(async event => {
  const startTime = Date.now();
  let currentStep = 'initialization';

  try {
    console.log('[API /analyze] Request received');
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

    // Validate URL format
    try {
      new URL(url);
    } catch {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid URL format'
      });
    }

    console.log('[API /analyze] URL validated:', url);

    // Initialize collector if needed
    currentStep = 'collector-initialization';
    if (!collector) {
      console.log('[API /analyze] Initializing new PerformanceCollector...');
      collector = new PerformanceCollector();
      await collector.initialize();
      console.log('[API /analyze] PerformanceCollector initialized');
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
    console.log('[API /analyze] Starting performance analysis...');
    const result = await collector.analyze(url, analysisOptions);
    console.log('[API /analyze] Performance analysis completed');

    // Perform Lighthouse analysis if requested
    if (analysisOptions.useLighthouse) {
      currentStep = 'lighthouse-analysis';
      if (!lighthouseCollector) {
        console.log('[API /analyze] Initializing LighthouseCollector...');
        lighthouseCollector = new LighthouseCollector();
      }

      try {
        console.log('[API /analyze] Starting Lighthouse analysis...');
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
        console.log('[API /analyze] Lighthouse analysis completed');
      } catch (lighthouseError) {
        console.error('[API /analyze] Lighthouse analysis failed:', lighthouseError);
        // Continue without Lighthouse data
      }
    }

    // Calculate custom metrics if any are defined
    if (analysisOptions.customMetrics && analysisOptions.customMetrics.length > 0) {
      currentStep = 'custom-metrics';
      try {
        console.log('[API /analyze] Calculating custom metrics...');
        // Get user timing and element timing data from the collector
        const userTimingData = collector.getUserTimingData?.() || [];
        const elementTimingData = collector.getElementTimingData?.() || [];

        result.customMetrics = CustomMetricsCalculator.calculateMetrics(
          analysisOptions.customMetrics,
          result,
          userTimingData,
          elementTimingData
        );
        console.log('[API /analyze] Custom metrics calculated');
      } catch (customMetricsError) {
        console.error('[API /analyze] Custom metrics calculation failed:', customMetricsError);
        // Continue without custom metrics
      }
    }

    // Include analysis options in the result for historical tracking
    result.options = analysisOptions;

    const totalTime = Date.now() - startTime;
    console.log(`[API /analyze] Request completed successfully in ${totalTime}ms`);

    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    const totalTime = Date.now() - startTime;
    console.error(`[API /analyze] Request failed at step '${currentStep}' after ${totalTime}ms`);
    console.error('[API /analyze] Error details:', {
      step: currentStep,
      message: error.message,
      statusCode: error.statusCode,
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
