import { loadHistory } from '../utils/historyStorage';
import { logger } from '../utils/logger';

export default defineEventHandler(() => {
  try {
    const history = loadHistory();
    logger.debug(`Returning ${history.length} history entries`);

    return {
      success: true,
      data: history
    };
  } catch (error) {
    logger.error('Failed to load history:', error);

    return {
      success: false,
      error: 'Failed to load history'
    };
  }
});
