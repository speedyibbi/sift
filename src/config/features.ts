/** Build-time feature flags. Not surfaced in the options page — rebuild required. */

import { readEnvBool } from './env';

/**
 * Deep-dive = render a job's full page (in a hidden iframe) and re-score it.
 */
export const DEEP_DIVE_ENABLED = readEnvBool(
  'WXT_DEEP_DIVE_ENABLED',
  import.meta.env.WXT_DEEP_DIVE_ENABLED,
  true,
);
