import { defineWebExtConfig } from 'wxt';

// `wxt dev` launches a Chromium browser to load the extension. Which binary it
// launches and where the persistent profile lives are read from a gitignored 
// `.env` (copy `.env.example` -> `.env`). With no `.env`, WXT auto-detects
// Chrome and a throwaway profile.
try {
  process.loadEnvFile();
} catch {
  // No .env (fresh clone / CI): fall back to WXT's auto-detection.
}

const { SIFT_DEV_BROWSER, SIFT_DEV_PROFILE } = process.env;

export default defineWebExtConfig({
  ...(SIFT_DEV_BROWSER ? { binaries: { chrome: SIFT_DEV_BROWSER } } : {}),
  ...(SIFT_DEV_PROFILE
    ? { chromiumProfile: SIFT_DEV_PROFILE, keepProfileChanges: true }
    : {}),
});
