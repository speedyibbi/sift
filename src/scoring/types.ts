import type { ExtractedJob } from '@/core';

// What a single scoring request gives the model.
export interface JobInput {
  card: ExtractedJob;
  fullDescription?: string; // present on deep-dive only
}
