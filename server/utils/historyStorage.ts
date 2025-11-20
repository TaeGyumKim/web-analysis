import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import type { AnalysisResult } from '~/types/performance';

const HISTORY_DIR = path.join(process.cwd(), '.data', 'history');
const HISTORY_FILE = path.join(HISTORY_DIR, 'analysis-history.json');
const MAX_HISTORY_ITEMS = 100;

export interface HistoryEntry {
  id: string;
  url: string;
  timestamp: string;
  result: {
    url: string;
    timestamp: string;
    runningTime: number;
    options: {
      networkThrottling?: string;
      cpuThrottling?: number;
    };
  };
}

// Ensure history directory exists
function ensureHistoryDir() {
  if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
  }
}

// Load history from file
export function loadHistory(): HistoryEntry[] {
  try {
    ensureHistoryDir();

    if (!fs.existsSync(HISTORY_FILE)) {
      return [];
    }

    const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    logger.error('Error loading history:', error);
    return [];
  }
}

// Save history to file
export function saveHistory(history: HistoryEntry[]): boolean {
  try {
    ensureHistoryDir();

    // Limit history size
    const limitedHistory = history.slice(0, MAX_HISTORY_ITEMS);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(limitedHistory, null, 2), 'utf-8');
    logger.debug(`Saved history with ${limitedHistory.length} entries`);
    return true;
  } catch (error) {
    logger.error('Error saving history:', error);
    return false;
  }
}

// Add a new entry to history
export function addHistoryEntry(result: AnalysisResult): boolean {
  try {
    const history = loadHistory();

    // Create minimal entry for storage
    const entry: HistoryEntry = {
      id: `${result.url}-${result.timestamp}`,
      url: result.url,
      timestamp: result.timestamp,
      result: {
        url: result.url,
        timestamp: result.timestamp,
        runningTime: result.runningTime,
        options: {
          networkThrottling: result.options?.networkThrottling,
          cpuThrottling: result.options?.cpuThrottling
        }
      }
    };

    logger.info('Adding history entry:', {
      url: entry.url,
      networkThrottling: entry.result.options.networkThrottling,
      cpuThrottling: entry.result.options.cpuThrottling,
      runningTime: entry.result.runningTime
    });

    // Add to beginning of array
    history.unshift(entry);

    // Save updated history
    return saveHistory(history);
  } catch (error) {
    logger.error('Error adding entry:', error);
    return false;
  }
}
