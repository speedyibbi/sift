/**
 * Parses optional WXT_/VITE_-prefixed build-time env vars, falling back safely
 * on missing or malformed input instead of producing a broken config value
 * (e.g. a NaN concurrency limit would silently deadlock the scoring queue).
 */

export function readEnvInt(name: string, raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    console.warn(`Sift: ${name}="${raw}" is invalid (expected a positive integer) — using ${fallback}.`);
    return fallback;
  }
  return parsed;
}

export function readEnvBool(name: string, raw: string | undefined, fallback: boolean): boolean {
  if (raw === undefined) return fallback;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  console.warn(`Sift: ${name}="${raw}" is invalid (expected "true" or "false") — using ${fallback}.`);
  return fallback;
}
