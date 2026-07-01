import { readEnvInt } from './env';

// Max concurrent LLM requests the background worker's scoring queue runs at once.
export const LLM_CONCURRENCY = readEnvInt(
  'WXT_LLM_CONCURRENCY',
  import.meta.env.WXT_LLM_CONCURRENCY,
  4,
);
