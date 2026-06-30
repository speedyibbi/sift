/** Defensive extraction of a verdict from raw model output (tolerates prose/fences). */

import type { JobVerdict, Recommendation, ScamRisk } from '@/core';

const RECOMMENDATIONS: Recommendation[] = ['apply', 'maybe', 'skip', 'filtered'];
const SCAM_RISKS: ScamRisk[] = ['low', 'medium', 'high'];

// Pull the first balanced JSON object out of arbitrary model text. Handles
// ```json fences, leading prose, and trailing chatter so a verbose model can't
// break the badge. Returns null if no balanced object is found.
export function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function clampScore(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
}

function oneOf<T extends string>(v: unknown, allowed: T[], fallback: T): T {
  const s = String(v).toLowerCase().trim();
  return (allowed as string[]).includes(s) ? (s as T) : fallback;
}

// Parse a model response into a partial verdict. The caller fills in jobId,
// source and cachedAt. Throws only if no JSON object can be found at all.
export function parseVerdict(
  raw: string,
): Omit<JobVerdict, 'jobId' | 'source' | 'cachedAt'> {
  const json = extractJsonObject(raw);
  if (!json) {
    throw new Error('Model response contained no JSON object');
  }
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(json) as Record<string, unknown>;
  } catch {
    throw new Error('Model response was not valid JSON');
  }

  return {
    fitScore: clampScore(obj.fitScore ?? obj.fit_score ?? obj.score),
    recommendation: oneOf<Recommendation>(
      obj.recommendation,
      RECOMMENDATIONS,
      'maybe',
    ),
    scamRisk: oneOf<ScamRisk>(
      obj.scamRisk ?? obj.scam_risk,
      SCAM_RISKS,
      'low',
    ),
    scamFlags: asStringArray(obj.scamFlags ?? obj.scam_flags),
    reasons: asStringArray(obj.reasons),
    skillMatch: asStringArray(obj.skillMatch ?? obj.skill_match),
  };
}
