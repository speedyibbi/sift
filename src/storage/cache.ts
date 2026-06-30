/**
 * Verdict cache keyed by job id, so scrolling past a job (or revisiting the
 * feed) doesn't re-spend an LLM call. 
 */

import { storage, browser } from '#imports';
import type { JobVerdict } from '@/core';

const key = (jobId: string) => `local:verdict:${encodeURIComponent(jobId)}` as const;

export async function getCachedVerdict(
  jobId: string,
  ttlMs: number,
): Promise<JobVerdict | null> {
  const v = await storage.getItem<JobVerdict>(key(jobId));
  if (!v) return null;
  if (Date.now() - v.cachedAt > ttlMs) {
    await storage.removeItem(key(jobId));
    return null;
  }
  return v;
}

export async function setCachedVerdict(v: JobVerdict): Promise<void> {
  await storage.setItem(key(v.jobId), v);
}

export async function clearVerdictCache(): Promise<void> {
  const all = await browser.storage.local.get();
  const keys = Object.keys(all).filter((k) => k.startsWith('verdict:'));
  if (keys.length) await browser.storage.local.remove(keys);
}
