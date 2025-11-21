import { PerformanceCollector } from './performanceCollector';
import type { AnalysisOptions, AnalysisResult } from '~/types/performance';
import { logger } from './logger';
import { QUEUE_CONFIG } from '~/utils/constants';

interface QueueItem {
  url: string;
  options: AnalysisOptions;
  resolve: (result: AnalysisResult) => void;
  reject: (error: Error) => void;
}

/**
 * Analysis Queue Manager
 * Handles concurrent analysis requests by queuing them and processing sequentially
 * to avoid conflicts with shared browser instances and state
 */
export class AnalysisQueue {
  private queue: QueueItem[] = [];
  private processing: boolean = false;
  private collector: PerformanceCollector | null = null;
  private readonly maxRetries = QUEUE_CONFIG.maxRetries;

  constructor() {
    logger.info('AnalysisQueue initialized');
  }

  /**
   * Add an analysis request to the queue
   * @param url - The URL to analyze
   * @param options - Analysis options
   * @returns Promise that resolves with the analysis result
   */
  async enqueue(url: string, options: AnalysisOptions): Promise<AnalysisResult> {
    return new Promise<AnalysisResult>((resolve, reject) => {
      const queueItem: QueueItem = { url, options, resolve, reject };
      this.queue.push(queueItem);

      logger.debug(`Analysis queued: ${url} (Queue size: ${this.queue.length})`);

      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      logger.info(`Processing analysis: ${item.url} (${this.queue.length} remaining in queue)`);

      try {
        const result = await this.performAnalysis(item.url, item.options);
        item.resolve(result);
      } catch (error) {
        logger.error(`Analysis failed for ${item.url}:`, error);
        item.reject(error instanceof Error ? error : new Error(String(error)));
      }
    }

    this.processing = false;
  }

  /**
   * Perform the actual analysis with retry logic
   */
  private async performAnalysis(
    url: string,
    options: AnalysisOptions,
    retryCount: number = 0
  ): Promise<AnalysisResult> {
    try {
      // Initialize collector if needed
      if (!this.collector) {
        logger.debug('Initializing PerformanceCollector');
        this.collector = new PerformanceCollector();
        await this.collector.initialize();
      }

      // Perform the analysis
      const result = await this.collector.analyze(url, options);
      return result;
    } catch (error) {
      // Retry logic for transient failures
      if (retryCount < this.maxRetries) {
        logger.warn(
          `Analysis failed, retrying (${retryCount + 1}/${this.maxRetries}): ${url}`,
          error
        );
        await new Promise(resolve =>
          setTimeout(resolve, QUEUE_CONFIG.retryDelayBase * (retryCount + 1))
        );
        return this.performAnalysis(url, options, retryCount + 1);
      }

      // If max retries reached, re-initialize collector for next requests
      logger.error(`Analysis failed after ${this.maxRetries} retries: ${url}`);
      await this.reinitializeCollector();
      throw error;
    }
  }

  /**
   * Reinitialize the collector (useful after failures)
   */
  private async reinitializeCollector(): Promise<void> {
    try {
      if (this.collector) {
        await this.collector.close();
        this.collector = null;
      }
      logger.debug('Collector reinitialized');
    } catch (error) {
      logger.error('Failed to reinitialize collector:', error);
    }
  }

  /**
   * Get current queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }

  /**
   * Check if queue is processing
   */
  isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Cleanup resources
   */
  async close(): Promise<void> {
    logger.info('Closing AnalysisQueue');

    // Clear queue
    this.queue = [];

    // Close collector
    if (this.collector) {
      await this.collector.close();
      this.collector = null;
    }

    this.processing = false;
  }
}

// Singleton instance
let queueInstance: AnalysisQueue | null = null;

/**
 * Get the singleton queue instance
 */
export function getAnalysisQueue(): AnalysisQueue {
  if (!queueInstance) {
    queueInstance = new AnalysisQueue();
  }
  return queueInstance;
}

/**
 * Cleanup queue on shutdown
 */
export async function closeAnalysisQueue(): Promise<void> {
  if (queueInstance) {
    await queueInstance.close();
    queueInstance = null;
  }
}
