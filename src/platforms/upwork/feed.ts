import type { ClientInfo, ContractType, ExtractedJob } from '@/core';
import type { ExtractedCard } from '../types';

/**
 * ============================================================================
 *  Read this before debugging.
 * ============================================================================
 * Upwork changes its markup periodically, so all the brittle knowledge lives
 * here in one place. The strategy, in order of preference:
 *   1. `data-test="..."` attributes (Upwork's own test hooks — fairly stable)
 *   2. structural/semantic fallbacks (h2/h3 > a, etc.)
 * Every field degrades gracefully to null/empty rather than throwing.
 *
 * To re-tune against the live site: log into Upwork, open the job feed, and in
 * DevTools run `document.querySelectorAll('[data-test="job-tile-list"] > section')`.
 * If that is empty, inspect a job card, find the current list/wrapper, and update
 * SELECTORS.tile below (then refresh test/fixtures/feed.html to match).
 */
const SELECTORS = {
  tile: [
    '[data-test="job-tile-list"] > section',
    '[data-test="JobTile"]',
    'article[data-test="JobTile"]',
    '[data-test="job-tile"]',
    'section[data-test="JobsList"] article',
  ],
  titleLink: [
    'a[data-test="job-tile-title-link"]',
    '[data-test="job-tile-title"] a',
    'h2 a[href*="/jobs/"]',
    'h3 a[href*="/jobs/"]',
    'a[href*="/jobs/"]',
    'h2 a',
    'h3 a',
  ],
  description: [
    '[data-test="job-description-text"]',
    '[data-test="UpCLineClamp JobDescription"]',
    '[data-test="job-description"]',
  ],
  jobType: ['[data-test="job-type-label"]', '[data-test="job-type"]', '[data-test="JobInfo"]'],
  experience: ['[data-test="contractor-tier"]', '[data-test="experience-level"]'],
  skills: ['[data-test="token"]', '[data-test="attr-item"]', '.air3-token'],
  proposals: ['[data-test="proposals-tier"]', '[data-test="proposals"]'],
  posted: ['[data-test="job-pubilshed-date"]', '[data-test="posted-on"]', '[data-test="UpCRelativeTime"]'],
  paymentVerified: ['[data-test="payment-verified"]', '[data-test="payment-verification-status"]'],
  totalSpent: ['[data-test="total-spent"]', '[data-test="client-spendings"]'],
  rating: ['[data-test="total-feedback"]', '[data-test="feedback-rating"]', '.air3-rating-value-text'],
  country: ['[data-test="client-country"]', '[data-test="location"]'],
} as const;

function first(root: ParentNode, selectors: readonly string[]): HTMLElement | null {
  for (const sel of selectors) {
    const el = root.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

function all(root: ParentNode, selectors: readonly string[]): HTMLElement[] {
  for (const sel of selectors) {
    const els = root.querySelectorAll<HTMLElement>(sel);
    if (els.length) return Array.from(els);
  }
  return [];
}

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

export function parseMoney(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/,/g, '').match(/\$?\s*([0-9]+(?:\.[0-9]+)?)\s*([kKmM])?/);
  if (!m) return null;
  let v = parseFloat(m[1]!);
  if (m[2]) v *= m[2].toLowerCase() === 'k' ? 1_000 : 1_000_000;
  return Math.round(v);
}

function allNumbers(s: string): number[] {
  return (s.replace(/,/g, '').match(/[0-9]+(?:\.[0-9]+)?/g) ?? []).map(Number);
}

const TIERS = ['entry level', 'intermediate', 'expert'];

function parseJobType(label: string): {
  contractType: ContractType;
  fixedBudget: number | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
} {
  const lower = label.toLowerCase();
  if (lower.includes('hourly')) {
    const nums = allNumbers(label);
    return {
      contractType: 'hourly',
      fixedBudget: null,
      hourlyMin: nums.length ? Math.min(...nums) : null,
      hourlyMax: nums.length ? Math.max(...nums) : null,
    };
  }
  if (lower.includes('fixed') || lower.includes('budget')) {
    return {
      contractType: 'fixed',
      fixedBudget: parseMoney(label),
      hourlyMin: null,
      hourlyMax: null,
    };
  }
  return { contractType: 'unknown', fixedBudget: null, hourlyMin: null, hourlyMax: null };
}

function parsePaymentVerified(el: HTMLElement | null): boolean | null {
  if (!el) return null;
  const t = text(el).toLowerCase();
  if (t.includes('unverified') || t.includes('not verified')) return false;
  if (t.includes('verified')) return true;
  return null;
}

function parseProposals(s: string): number | null {
  if (!s) return null;
  const nums = allNumbers(s);
  if (!nums.length) return null;
  // "Less than 5" -> 5; "20 to 50" -> 50; take the upper bound.
  return Math.max(...nums);
}

function parseRating(s: string): number | null {
  const nums = allNumbers(s);
  if (!nums.length) return null;
  const r = nums[0]!;
  return r >= 0 && r <= 5 ? r : null;
}

const CIPHERTEXT = /(~[0-9a-z]+)/i;
const ORIGIN = 'https://www.upwork.com';

function djb2(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function toAbsolute(href: string): string {
  if (!href) return '';
  if (/^https?:\/\//.test(href)) return href;
  return ORIGIN + (href.startsWith('/') ? href : `/${href}`);
}

// Parse a single job-tile element into an ExtractedJob.
export function extractJobFromTile(tile: HTMLElement): ExtractedJob {
  const titleEl = first(tile, SELECTORS.titleLink);
  const href = titleEl?.getAttribute('href') ?? '';
  const url = toAbsolute(href);
  const idMatch = href.match(CIPHERTEXT);
  const id = idMatch ? idMatch[1]! : `url:${djb2(url || text(titleEl))}`;

  const typeLabel = text(first(tile, SELECTORS.jobType));
  const jobType = parseJobType(typeLabel);

  let experienceLevel = text(first(tile, SELECTORS.experience)) || null;
  if (!experienceLevel) {
    const tier = TIERS.find((t) => typeLabel.toLowerCase().includes(t));
    experienceLevel = tier ? tier.replace(/\b\w/g, (c) => c.toUpperCase()) : null;
  }

  const skills = all(tile, SELECTORS.skills)
    .map((el) => text(el))
    .filter(Boolean);

  const client: ClientInfo = {
    paymentVerified: parsePaymentVerified(first(tile, SELECTORS.paymentVerified)),
    totalSpent: parseMoney(text(first(tile, SELECTORS.totalSpent))),
    rating: parseRating(text(first(tile, SELECTORS.rating))),
    country: text(first(tile, SELECTORS.country)) || null,
    totalHires: null,
  };

  return {
    id,
    url,
    title: text(titleEl),
    descriptionSnippet: text(first(tile, SELECTORS.description)),
    contractType: jobType.contractType,
    fixedBudget: jobType.fixedBudget,
    hourlyMin: jobType.hourlyMin,
    hourlyMax: jobType.hourlyMax,
    experienceLevel,
    skills,
    proposals: parseProposals(text(first(tile, SELECTORS.proposals))),
    postedAt: text(first(tile, SELECTORS.posted)) || null,
    client,
  };
}

// Find every job tile under `root` and parse it.
export function extractFeedCards(root: ParentNode = document): ExtractedCard[] {
  const tiles = all(root, SELECTORS.tile);
  return tiles
    .map((el) => ({ el, job: extractJobFromTile(el) }))
    .filter((c) => c.job.title); // skip anything we couldn't read a title from
}
