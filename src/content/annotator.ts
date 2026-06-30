/**
 * Content-script orchestrator: watches a platform's feed, scores each job card
 * via the background worker, and renders a verdict badge on it.
 */

import type { ExtractedJob, JobVerdict, Message, ScoreResponse, Settings } from '@/core';
import type { DetailData, Platform } from '@/platforms';
import { runPrefilter } from '@/prefilter';
import { getSettings, watchSettings } from '@/storage';
import { renderBadge, type BadgeHandlers } from '@/ui';

const DEEP_DIVE_TIMEOUT_MS = 15000;

// Watch `platform`'s feed and badge every job card. `send` dispatches scoring to
// the background worker — injected so this module stays free of WXT `#imports`.
export async function startAnnotator(
  platform: Platform,
  send: (msg: Message) => Promise<ScoreResponse>,
): Promise<void> {
  let settings: Settings = await getSettings();

  // jobId -> { el, job } so deep-dive and re-renders can find the card/data.
  const cards = new Map<string, { el: HTMLElement; job: ExtractedJob }>();
  // jobId -> last verdict, for instant re-render when the feed virtualizes.
  const verdicts = new Map<string, JobVerdict>();

  // A rules/profile change invalidates prior judgements: drop the in-memory
  // verdicts so the next scan re-scores. (Options clears the persistent cache.)
  watchSettings((s) => {
    const stale =
      JSON.stringify(s.rules) !== JSON.stringify(settings.rules) ||
      JSON.stringify(s.profile) !== JSON.stringify(settings.profile);
    settings = s;
    if (stale) verdicts.clear();
  });

  const handlers: BadgeHandlers = {
    onDeepDive: (jobId) => enqueueDeepDive(jobId),
    onRescore: (jobId) => {
      const entry = cards.get(jobId);
      if (!entry) return;
      verdicts.delete(jobId);
      void processCard(entry.el, entry.job, true);
    },
  };

  // ----- Deep-dive queue (cap 1) -----

  // A deep-dive renders the job page in a hidden same-origin iframe — a plain
  // fetch is bot-blocked (403), but a real iframe navigation passes. Each iframe
  // boots the platform's full SPA, so they run strictly one-at-a-time.
  const deepDiveQueue: string[] = [];
  let deepDiveBusy = false;

  function enqueueDeepDive(jobId: string): void {
    if (deepDiveQueue.includes(jobId)) return; // dedup re-clicks / queued dupes
    deepDiveQueue.push(jobId);
    void drainDeepDiveQueue();
  }

  async function drainDeepDiveQueue(): Promise<void> {
    if (deepDiveBusy) return;
    deepDiveBusy = true;
    try {
      while (deepDiveQueue.length) {
        await runDeepDive(deepDiveQueue[0]!);
        deepDiveQueue.shift();
      }
    } finally {
      deepDiveBusy = false;
    }
  }

  async function runDeepDive(jobId: string): Promise<void> {
    const entry = cards.get(jobId);
    if (!entry) return;
    const quickFitScore = verdicts.get(jobId)?.fitScore; // inline score, pre-deep
    const job = { ...entry.job };
    try {
      const { fullDescription, skills } = await renderDetail(job.url);
      if (fullDescription) job.fullDescription = fullDescription;
      if (skills.length) job.skills = Array.from(new Set([...job.skills, ...skills]));
    } catch {
      // Fall through: scoring will just use the snippet.
    }
    const resp = await send({ type: 'DEEP_DIVE', job });
    applyResponse(entry.el, jobId, resp, { quickFitScore });
  }

  // Load `url` in an off-screen iframe and read the description once the SPA has
  // rendered it (poll until the parsed length stops growing, or time out). The
  // iframe is always removed — it holds a full app instance + a WebSocket.
  function renderDetail(url: string): Promise<DetailData> {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        'position:fixed; left:-10000px; top:0; width:1280px; height:1000px; border:0;';

      let settled = false;
      let lastLen = -1;
      let poll = 0;
      let timer = 0;

      const safeDoc = (): Document | null => {
        try {
          return iframe.contentDocument;
        } catch {
          return null; // a cross-origin challenge redirect locks us out
        }
      };

      const finish = (): void => {
        if (settled) return;
        settled = true;
        clearInterval(poll);
        clearTimeout(timer);
        const doc = safeDoc();
        const detail = doc ? platform.extractDetail(doc) : { fullDescription: '', skills: [] };
        iframe.remove();
        resolve(detail);
      };

      timer = window.setTimeout(finish, DEEP_DIVE_TIMEOUT_MS);
      poll = window.setInterval(() => {
        const doc = safeDoc();
        if (!doc) return;
        const len = platform.extractDetail(doc).fullDescription.length;
        if (len > 200 && len === lastLen) finish(); // stable ~500ms -> read it
        else lastLen = len;
      }, 500);

      iframe.src = url;
      document.body.appendChild(iframe);
    });
  }

  // ----- Scoring + rendering -----

  // `deep` is set only right after a deep-dive: it carries the prior inline
  // fitScore (for the delta) and opens the panel so the richer result shows.
  function applyResponse(
    el: HTMLElement,
    jobId: string,
    resp: ScoreResponse,
    deep?: { quickFitScore?: number },
  ): void {
    if (resp.ok) {
      verdicts.set(jobId, resp.verdict);
      renderBadge(
        el,
        jobId,
        {
          kind: 'verdict',
          verdict: resp.verdict,
          quickFitScore: deep?.quickFitScore,
          expand: deep !== undefined,
        },
        handlers,
      );
    } else {
      renderBadge(el, jobId, { kind: 'error', message: resp.error }, handlers);
    }
  }

  async function processCard(el: HTMLElement, job: ExtractedJob, force = false): Promise<void> {
    cards.set(job.id, { el, job });

    // Instant re-render if we already have a verdict (feed re-rendered the node).
    // A forced re-score skips this and the background cache.
    if (!force) {
      const known = verdicts.get(job.id);
      if (known) {
        renderBadge(el, job.id, { kind: 'verdict', verdict: known }, handlers);
        return;
      }
    }

    const pre = runPrefilter(job, settings.rules);
    if (pre.decision === 'fail') {
      renderBadge(el, job.id, { kind: 'filtered', reasons: pre.reasons }, handlers);
      return;
    }

    renderBadge(el, job.id, { kind: 'scoring' }, handlers);
    const resp = await send({ type: 'SCORE_JOB', job, hints: pre.reasons, force });
    applyResponse(el, job.id, resp);
  }

  // ----- Feed watcher -----

  function scan(): void {
    for (const { el, job } of platform.extractFeed(document)) {
      // Skip nodes we've already badged for this job (the observer fires on our
      // own writes). Re-process if a virtualized node now holds a new job.
      if (el.dataset.siftJob === job.id && el.querySelector(':scope > .sift-badge')) {
        continue;
      }
      el.dataset.siftJob = job.id;
      el.querySelector(':scope > .sift-badge')?.remove();
      void processCard(el, job);
    }
  }

  // Initial pass + debounced re-scan for infinite scroll / SPA navigation.
  scan();
  let timer: number | undefined;
  const observer = new MutationObserver(() => {
    clearTimeout(timer);
    timer = window.setTimeout(scan, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
