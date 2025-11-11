import { PerformanceCollector } from '~/server/utils/performanceCollector';
import type { AnalysisOptions } from '~/types/performance';

let collector: PerformanceCollector | null = null;

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
      waitUntil: options?.waitUntil ?? 'networkidle0'
    };

    // Perform analysis
    const result = await collector.analyze(url, analysisOptions);

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
