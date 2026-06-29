/** Message protocol between the content script and the background worker. */

import type { ExtractedJob } from './job';
import type { JobVerdict } from './verdict';

export type Message =
  | { type: 'SCORE_JOB'; job: ExtractedJob; hints?: string[]; force?: boolean } // force = bypass cache
  | { type: 'DEEP_DIVE'; job: ExtractedJob; hints?: string[] } // job.fullDescription pre-filled by the content script
  | { type: 'TEST_CONNECTION' };

export type ScoreResponse =
  | { ok: true; verdict: JobVerdict }
  | { ok: false; error: string };

export type TestResponse = { ok: true } | { ok: false; error: string };
