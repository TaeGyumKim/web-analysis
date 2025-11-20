import { loadHistory } from '../utils/historyStorage';

export default defineEventHandler(() => {
  try {
    const history = loadHistory();
    console.log('[GET /api/history] Returning', history.length, 'entries');

    return {
      success: true,
      data: history
    };
  } catch (error) {
    console.error('[GET /api/history] Error:', error);

    return {
      success: false,
      error: 'Failed to load history'
    };
  }
});
