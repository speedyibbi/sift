/** Background worker: routes content-script messages to scoring + the verdict cache. */

import { defineBackground, browser } from '#imports';
import { createLimiter } from '@/core';
import type {
  JobVerdict,
  Message,
  ScoreResponse,
  TestResponse,
} from '@/core';
import { LLM_CONCURRENCY } from '@/config';
import { scoreJob } from '@/scoring';
import { testConnection } from '@/llm';
import { getSettings, getCachedVerdict, setCachedVerdict } from '@/storage';

const limit = createLimiter(LLM_CONCURRENCY);

async function handleScore(
  msg: Extract<Message, { type: 'SCORE_JOB' | 'DEEP_DIVE' }>,
): Promise<ScoreResponse> {
  const deep = msg.type === 'DEEP_DIVE';
  const force = msg.type === 'SCORE_JOB' && msg.force === true;
  try {
    const settings = await getSettings();
    if (!deep && !force) {
      const cached = await getCachedVerdict(
        msg.job.id,
        settings.cacheTtlHours * 60 * 60 * 1000,
      );
      if (cached) return { ok: true, verdict: cached };
    }

    const partial = await limit(() =>
      scoreJob(
        { card: msg.job, fullDescription: deep ? msg.job.fullDescription : undefined },
        settings.profile,
        settings.rules,
        settings.provider,
        msg.hints ?? [],
      ),
    );

    const verdict: JobVerdict = {
      ...partial,
      jobId: msg.job.id,
      source: deep ? 'llm-deep' : 'llm',
      cachedAt: Date.now(),
    };
    await setCachedVerdict(verdict);
    return { ok: true, verdict };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function handleTest(): Promise<TestResponse> {
  try {
    const settings = await getSettings();
    await testConnection(settings.provider);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default defineBackground(() => {
  // WXT's `browser` is the native chrome API (no webextension-polyfill), so a
  // Promise returned from an onMessage listener is IGNORED and the sender just
  // gets `undefined`. The native MV3 contract is: call sendResponse() with the
  // result and return true to keep the message channel open for the async reply.
  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const msg = message as Message;
    switch (msg.type) {
      case 'SCORE_JOB':
      case 'DEEP_DIVE':
        void handleScore(msg).then(sendResponse);
        return true;
      case 'TEST_CONNECTION':
        void handleTest().then(sendResponse);
        return true;
      default:
        return undefined;
    }
  });
});
