import type { JobVerdict, Profile, ProviderConfig, Rules } from '@/core';
import type { JobInput } from './types';
import { complete } from '@/llm';
import { buildScoringPrompt } from './prompt';
import { parseVerdict } from './parse';

// Score one job with the configured provider. Returns a partial verdict; the
// caller stamps jobId/source/cachedAt. Deep dives pass `input.fullDescription`.
export async function scoreJob(
  input: JobInput,
  profile: Profile,
  rules: Rules,
  cfg: ProviderConfig,
  prefilterHints: string[] = [],
): Promise<Omit<JobVerdict, 'jobId' | 'source' | 'cachedAt'>> {
  if (!cfg.apiKey) {
    throw new Error('No API key set — open the extension options to add one.');
  }
  const { system, user } = buildScoringPrompt(input, profile, rules, prefilterHints);
  const raw = await complete({ system, user, maxTokens: 700, temperature: 0 }, cfg);
  return parseVerdict(raw);
}
