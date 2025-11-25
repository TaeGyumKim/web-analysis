import { logger } from './logger';

/**
 * User-friendly error messages for common failure scenarios
 */
export const ERROR_MESSAGES = {
  TIMEOUT: {
    title: 'Page Load Timeout',
    message:
      'The page took too long to load. Try increasing the timeout, using less strict network conditions, or checking if the URL is accessible.',
    suggestions: [
      'Increase the timeout value in settings',
      'Use faster network throttling (e.g., 4G instead of 3G)',
      'Check if the website is responding correctly',
      'Try with a different waitUntil condition'
    ]
  },
  NETWORK_ERROR: {
    title: 'Network Error',
    message:
      'Unable to connect to the specified URL. Please check the URL and your network connection.',
    suggestions: [
      'Verify the URL is correct and accessible',
      'Check your internet connection',
      'Ensure the website is not blocking automated access',
      'Try again in a few moments'
    ]
  },
  INVALID_URL: {
    title: 'Invalid URL',
    message: 'The provided URL is not valid. Please check the format and try again.',
    suggestions: [
      'Ensure the URL starts with http:// or https://',
      'Check for typos in the URL',
      'Make sure the domain name is valid'
    ]
  },
  BROWSER_CRASH: {
    title: 'Browser Crash',
    message:
      'The analysis browser crashed unexpectedly. This may be due to the page complexity or resource constraints.',
    suggestions: [
      'Try analyzing a simpler page first',
      'Disable screenshot capture to reduce memory usage',
      'Reduce viewport size',
      'Try again - this issue may be temporary'
    ]
  },
  LIGHTHOUSE_FAILED: {
    title: 'Lighthouse Analysis Failed',
    message:
      'The Lighthouse audit could not be completed. The main performance analysis may still be available.',
    suggestions: [
      'Try running without Lighthouse enabled',
      'Check if the page has any blocking content',
      'Ensure the page is publicly accessible'
    ]
  },
  RESOURCE_EXHAUSTED: {
    title: 'Resource Exhausted',
    message:
      'The analysis consumed too many resources. This usually happens with very complex pages.',
    suggestions: [
      'Disable screenshot capture',
      'Use a smaller viewport size',
      'Try analyzing a specific page section instead of the full site'
    ]
  },
  GENERIC: {
    title: 'Analysis Failed',
    message: 'An unexpected error occurred during analysis. Please try again.',
    suggestions: [
      'Verify the URL is accessible',
      'Try with default settings',
      'Check the browser console for details',
      'Contact support if the issue persists'
    ]
  }
} as const;

/**
 * Error types that can be detected
 */
export type ErrorType = keyof typeof ERROR_MESSAGES;

/**
 * Enhanced error interface with user-friendly information
 */
export interface EnhancedError {
  type: ErrorType;
  title: string;
  message: string;
  suggestions: string[];
  originalError?: string;
  timestamp: number;
}

/**
 * Classify an error based on its message and properties
 */
export function classifyError(error: any): ErrorType {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';

  // Timeout errors
  if (
    errorMessage.includes('timeout') ||
    errorMessage.includes('navigation timeout') ||
    errorMessage.includes('waiting for')
  ) {
    return 'TIMEOUT';
  }

  // Network errors
  if (
    errorMessage.includes('net::') ||
    errorMessage.includes('network') ||
    errorMessage.includes('econnrefused') ||
    errorMessage.includes('enotfound') ||
    errorMessage.includes('failed to fetch')
  ) {
    return 'NETWORK_ERROR';
  }

  // Invalid URL
  if (
    errorMessage.includes('invalid url') ||
    errorMessage.includes('cannot navigate') ||
    errorName.includes('typeerror')
  ) {
    return 'INVALID_URL';
  }

  // Browser crash
  if (
    errorMessage.includes('crash') ||
    errorMessage.includes('disconnected') ||
    errorMessage.includes('target closed') ||
    errorMessage.includes('session closed')
  ) {
    return 'BROWSER_CRASH';
  }

  // Lighthouse specific
  if (errorMessage.includes('lighthouse') || errorMessage.includes('lhr')) {
    return 'LIGHTHOUSE_FAILED';
  }

  // Resource exhaustion
  if (
    errorMessage.includes('out of memory') ||
    errorMessage.includes('heap') ||
    errorMessage.includes('allocation failed')
  ) {
    return 'RESOURCE_EXHAUSTED';
  }

  return 'GENERIC';
}

/**
 * Create an enhanced error with user-friendly information
 */
export function createEnhancedError(error: any, context?: string): EnhancedError {
  const errorType = classifyError(error);
  const errorInfo = ERROR_MESSAGES[errorType];

  const enhancedError: EnhancedError = {
    type: errorType,
    title: errorInfo.title,
    message: context ? `${errorInfo.message} (${context})` : errorInfo.message,
    suggestions: errorInfo.suggestions,
    originalError: error?.message || String(error),
    timestamp: Date.now()
  };

  // Log the error for debugging
  logger.error(`[${errorType}] ${enhancedError.title}`, {
    message: enhancedError.message,
    originalError: enhancedError.originalError,
    context
  });

  return enhancedError;
}

/**
 * Format an enhanced error for API response
 */
export function formatErrorForResponse(enhancedError: EnhancedError) {
  return {
    success: false,
    error: {
      type: enhancedError.type,
      title: enhancedError.title,
      message: enhancedError.message,
      suggestions: enhancedError.suggestions,
      timestamp: enhancedError.timestamp
    }
  };
}

/**
 * Wrap an async function with enhanced error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<T | EnhancedError> {
  return fn().catch(error => {
    return createEnhancedError(error, context);
  });
}
