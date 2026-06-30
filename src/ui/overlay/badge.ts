/** The verdict badge injected onto a job card — the in-page overlay UI. */

import type { JobVerdict, Recommendation } from '@/core';
import { DEEP_DIVE_ENABLED } from '@/config';

// All visible job/model text is set via textContent (never innerHTML) so a
// malicious listing or model output can't inject markup into the Upwork page.

export type BadgeState =
  | { kind: 'scoring' }
  | { kind: 'filtered'; reasons: string[] }
  // quickFitScore = the inline verdict's score before a deep-dive (drives the
  // delta line); expand = open the panel right away (set when a deep-dive just
  // finished, so the richer result is visible without a click).
  | { kind: 'verdict'; verdict: JobVerdict; quickFitScore?: number; expand?: boolean }
  | { kind: 'error'; message: string };

export interface BadgeHandlers {
  onDeepDive: (jobId: string) => void;
  onRescore: (jobId: string) => void;
}

const STYLE_ID = 'sift-styles';
const REC_LABEL: Record<Recommendation, string> = {
  apply: 'Apply',
  maybe: 'Maybe',
  skip: 'Skip',
  filtered: 'Filtered',
};

function ensureStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.sift-badge { position: absolute; top: 8px; right: 8px; z-index: 50; font: 12px/1.4 system-ui, sans-serif; text-align: left; }
.sift-pill { border: none; border-radius: 999px; padding: 3px 10px; font-weight: 600; cursor: pointer; color: #fff; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 1px 4px rgba(0,0,0,.25); }
.sift-rec-apply .sift-pill { background: #11845b; }
.sift-rec-maybe .sift-pill { background: #b8860b; }
.sift-rec-skip .sift-pill { background: #8a8f98; }
.sift-rec-filtered .sift-pill { background: #c0392b; opacity: .8; }
.sift-state-scoring .sift-pill { background: #4a5568; }
.sift-state-error .sift-pill { background: #c0392b; }
.sift-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.sift-scam-low { background: #6ee7b7; } .sift-scam-medium { background: #fcd34d; } .sift-scam-high { background: #fca5a5; }
.sift-panel { margin-top: 6px; width: 280px; max-width: 80vw; background: #fff; color: #1a202c; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; box-shadow: 0 6px 20px rgba(0,0,0,.18); }
.sift-panel h4 { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #718096; }
.sift-panel ul { margin: 0 0 8px; padding-left: 16px; }
.sift-panel li { margin: 2px 0; }
.sift-chips { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
.sift-chip { background: #edf2f7; border-radius: 4px; padding: 1px 6px; font-size: 11px; }
.sift-flags { color: #c0392b; }
.sift-deep { width: 100%; border: 1px solid #cbd5e0; background: #f7fafc; border-radius: 6px; padding: 6px; cursor: pointer; font-weight: 600; }
.sift-deep:disabled { opacity: .6; cursor: default; }
.sift-delta { font-size: 12px; font-weight: 700; margin: 0 0 8px; }
.sift-delta-up { color: #11845b; } .sift-delta-down { color: #c0392b; } .sift-delta-flat { color: #718096; }
.sift-hidden { display: none; }
`;
  document.head.appendChild(style);
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  textContent?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (textContent !== undefined) node.textContent = textContent;
  return node;
}

function section(title: string, items: string[]): HTMLElement | null {
  if (!items.length) return null;
  const wrap = el('div');
  wrap.appendChild(el('h4', undefined, title));
  const ul = el('ul');
  for (const item of items) ul.appendChild(el('li', undefined, item));
  wrap.appendChild(ul);
  return wrap;
}

function pillText(state: BadgeState): string {
  switch (state.kind) {
    case 'scoring':
      return '⏳ Scoring…';
    case 'filtered':
      return '✕ Filtered';
    case 'error':
      return '⚠ Error';
    case 'verdict': {
      const icon = state.verdict.source === 'llm-deep' ? '🔍' : '⚡';
      return `${icon} ${state.verdict.fitScore} · ${REC_LABEL[state.verdict.recommendation]}`;
    }
  }
}

function stateClass(state: BadgeState): string {
  switch (state.kind) {
    case 'verdict':
      return `sift-rec-${state.verdict.recommendation}`;
    case 'filtered':
      return 'sift-rec-filtered';
    case 'scoring':
      return 'sift-state-scoring';
    case 'error':
      return 'sift-state-error';
  }
}

function rescoreButton(jobId: string, handlers: BadgeHandlers): HTMLButtonElement {
  const btn = el('button', 'sift-deep', '↻ Re-score');
  btn.style.marginTop = '6px';
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    btn.disabled = true;
    btn.textContent = 'Re-scoring…';
    handlers.onRescore(jobId);
  });
  return btn;
}

function buildPanel(
  jobId: string,
  state: BadgeState,
  handlers: BadgeHandlers,
): HTMLElement {
  const expanded = state.kind === 'verdict' && state.expand === true;
  const panel = el('div', expanded ? 'sift-panel' : 'sift-panel sift-hidden');

  if (state.kind === 'filtered') {
    panel.appendChild(el('h4', undefined, 'Filtered out — no LLM used'));
    const ul = el('ul');
    for (const r of state.reasons) ul.appendChild(el('li', undefined, r));
    panel.appendChild(ul);
    panel.appendChild(rescoreButton(jobId, handlers));
    return panel;
  }

  if (state.kind === 'error') {
    panel.appendChild(el('h4', 'sift-flags', 'Could not score'));
    panel.appendChild(el('div', undefined, state.message));
    panel.appendChild(rescoreButton(jobId, handlers));
    return panel;
  }

  if (state.kind === 'verdict') {
    const v = state.verdict;
    const why = section('Why', v.reasons);
    if (why) panel.appendChild(why);

    if (v.skillMatch.length) {
      panel.appendChild(el('h4', undefined, 'Skill match'));
      const chips = el('div', 'sift-chips');
      for (const s of v.skillMatch) chips.appendChild(el('span', 'sift-chip', s));
      panel.appendChild(chips);
    }

    const flags = section('⚠ Red flags', v.scamFlags);
    if (flags) {
      flags.className = 'sift-flags';
      panel.appendChild(flags);
    }

    if (v.source === 'llm-deep') {
      panel.appendChild(el('h4', undefined, '🔍 Deep analysis · full description'));
      const q = state.quickFitScore;
      if (q !== undefined) {
        const up = v.fitScore > q;
        const flat = v.fitScore === q;
        const line = flat
          ? `Fit ${v.fitScore} confirmed on the full post`
          : `Fit ${up ? '▲' : '▼'} ${q} → ${v.fitScore} on the full post`;
        const cls = flat ? 'sift-delta-flat' : up ? 'sift-delta-up' : 'sift-delta-down';
        panel.appendChild(el('div', `sift-delta ${cls}`, line));
      }
    } else if (DEEP_DIVE_ENABLED) {
      const btn = el('button', 'sift-deep', 'Deep-dive full description');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.disabled = true;
        btn.textContent = 'Analyzing…';
        handlers.onDeepDive(jobId);
      });
      panel.appendChild(btn);
    }

    panel.appendChild(rescoreButton(jobId, handlers));
  }

  return panel;
}

// Create or replace the badge anchored inside a job card. Idempotent: calling
// again with a new state swaps the contents in place.
export function renderBadge(
  card: HTMLElement,
  jobId: string,
  state: BadgeState,
  handlers: BadgeHandlers,
): void {
  ensureStyles();
  if (getComputedStyle(card).position === 'static') {
    card.style.position = 'relative';
  }

  card.querySelector(':scope > .sift-badge')?.remove();

  const badge = el('div', `sift-badge ${stateClass(state)}`);
  badge.dataset.siftJob = jobId;

  const pill = el('button', 'sift-pill');
  pill.appendChild(el('span', undefined, pillText(state)));
  if (state.kind === 'verdict') {
    pill.appendChild(el('span', `sift-dot sift-scam-${state.verdict.scamRisk}`));
  }

  const panel = buildPanel(jobId, state, handlers);
  pill.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    panel.classList.toggle('sift-hidden');
  });

  badge.appendChild(pill);
  badge.appendChild(panel);
  card.appendChild(badge);
}
