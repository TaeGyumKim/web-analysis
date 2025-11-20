/**
 * Logging utility for controlling log verbosity based on environment
 */

const isDevelopment = process.env.NODE_ENV !== 'production';
const isVerbose = process.env.VERBOSE_LOGGING === 'true';

export const logger = {
  /**
   * Log information - always shown
   */
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },

  /**
   * Log errors - always shown
   */
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  },

  /**
   * Log warnings - always shown
   */
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  /**
   * Debug logs - only shown in development or when VERBOSE_LOGGING=true
   */
  debug: (message: string, ...args: any[]) => {
    if (isDevelopment || isVerbose) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
};
