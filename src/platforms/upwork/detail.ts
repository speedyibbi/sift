/**
 * Parses the full job page HTML fetched during a deep-dive. Runs in the content
 * script (which has a real DOMParser) — never in the background worker, which
 * has no DOM. Best-effort: tries the rendered description block, then a
 * schema.org JobPosting JSON-LD blob, then the og:description meta.
 *
 * NOTE: Upwork is a SPA, so a raw fetch may return a shell without the rendered
 * description block — the JSON-LD path is what usually saves the deep-dive in
 * that case. If `fullDescription` still comes back empty, scoring falls back to
 * the feed snippet.
 */

import type { DetailData } from '../types';

const DESC_SELECTORS = [
  '[data-test="Description"]',
  '[data-test="job-description"]',
  '[data-test="DescriptionPanel"]',
  'section[data-test="Description"]',
  '.job-description',
  '.break.text-pre-line',
];

const SKILL_SELECTORS = ['[data-test="Skills"] a', '[data-test="token"]', '.air3-token'];

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

// Render an HTML fragment (JSON-LD descriptions are markup) to plain text.
function htmlToText(html: string): string {
  return text(new DOMParser().parseFromString(html, 'text/html').body);
}

function ldSkills(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((s) => String(s).trim()).filter(Boolean);
  if (typeof v === 'string') return v.split(',').map((s) => s.trim()).filter(Boolean);
  return [];
}

// Pull the description/skills out of a schema.org JobPosting embedded as
// `<script type="application/ld+json">`. SPA shells routinely drop the rendered
// description block but still emit this for SEO, so it's the most reliable
// source on a raw fetch. Handles the single-object, array, and `@graph` shapes.
function jobPostingFromJsonLd(doc: Document): { description: string; skills: string[] } | null {
  for (const script of Array.from(
    doc.querySelectorAll('script[type="application/ld+json"]'),
  )) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent ?? '');
    } catch {
      continue;
    }
    const nodes = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed['@graph'])
        ? parsed['@graph']
        : [parsed];
    for (const node of nodes) {
      if (!isRecord(node)) continue;
      const type = node['@type'];
      const isJob = Array.isArray(type) ? type.includes('JobPosting') : type === 'JobPosting';
      if (!isJob) continue;
      return {
        description: typeof node.description === 'string' ? htmlToText(node.description) : '',
        skills: ldSkills(node.skills),
      };
    }
  }
  return null;
}

export function extractDetail(doc: Document): DetailData {
  let description = '';
  for (const sel of DESC_SELECTORS) {
    const el = doc.querySelector(sel);
    if (el && text(el).length > description.length) description = text(el);
  }

  // SPA shells often omit the rendered description block but still embed a
  // schema.org JobPosting for SEO; its `description` is the fullest source.
  const ld = jobPostingFromJsonLd(doc);
  if (ld && ld.description.length > description.length) description = ld.description;

  if (!description) {
    const og = doc.querySelector('meta[property="og:description"]');
    description = og?.getAttribute('content')?.trim() ?? '';
  }

  let skills: string[] = [];
  for (const sel of SKILL_SELECTORS) {
    const els = doc.querySelectorAll(sel);
    if (els.length) {
      skills = Array.from(els).map((e) => text(e)).filter(Boolean);
      break;
    }
  }
  if (!skills.length && ld) skills = ld.skills;

  return { fullDescription: description, skills };
}

export function extractDetailFromHtml(html: string): DetailData {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return extractDetail(doc);
}
