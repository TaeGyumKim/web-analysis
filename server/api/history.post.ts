import { addHistoryEntry } from '../utils/historyStorage';
import type { AnalysisResult } from '~/types/performance';

export default defineEventHandler(async event => {
  try {
    const body = await readBody(event);
    const result = body.result as AnalysisResult;

    if (!result) {
      return {
        success: false,
        error: 'Missing result in request body'
      };
    }

    const saved = addHistoryEntry(result);

    if (!saved) {
      return {
        success: false,
        error: 'Failed to save history entry'
      };
    }

    return {
      success: true,
      message: 'History entry saved successfully'
    };
  } catch (error) {
    console.error('[POST /api/history] Error:', error);

    return {
      success: false,
      error: 'Failed to save history entry'
    };
  }
});
