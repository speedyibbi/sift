/** The contract a platform implements, plus the shapes its extraction produces. */

import type { ExtractedJob } from '@/core';

// A job card located in the feed, paired with the element to anchor a badge to.
export interface ExtractedCard {
  el: HTMLElement;
  job: ExtractedJob;
}

// A job's full detail page, parsed on deep-dive.
export interface DetailData {
  fullDescription: string;
  skills: string[];
}

// Extraction details for a platform.
export interface Platform {
  matches: string[];
  extractFeed(root: ParentNode): ExtractedCard[];
  extractDetail(doc: Document): DetailData;
}
