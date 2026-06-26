import { defineConfig } from 'vitest/config';

// Unit tests cover the pure modules only (extractor, prefilter, JSON parsing).
// They intentionally avoid WXT's `#imports` so they run without the extension
// runtime. happy-dom gives us DOMParser/document for the extractor tests.
export default defineConfig({
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
