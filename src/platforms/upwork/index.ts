import type { Platform } from '../types';
import { extractFeedCards } from './feed';
import { extractDetail } from './detail';

// Upwork feed + job-detail extraction.
export const upwork: Platform = {
  matches: ['*://*.upwork.com/*'],
  extractFeed: extractFeedCards,
  extractDetail,
};
