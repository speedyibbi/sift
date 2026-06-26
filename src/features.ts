/**
 * Build-time feature flags
 * Not surfaced in the options page — flip here and rebuild
 */

/**
 * Deep-dive = render a job's full page (in a hidden iframe) and re-score it.
 * Heavier and more fragile than inline scoring (boots Upwork's SPA, relies on
 * same-origin framing surviving), so it's gated behind a single switch.
 */
export const DEEP_DIVE_ENABLED = true;
