import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: '.',
  vite: () => ({
    resolve: {
      alias: {
        '@': new URL('./src', import.meta.url).pathname,
      },
    },
  }),
  manifest: {
    name: 'Sift',
    description:
      'Scores Upwork job postings for fit and scam risk inline, while browsing.',
    permissions: ['storage'],
    // host_permissions let the background service worker call LLM APIs cross-origin
    // (bypassing CORS) and let the content script run on Upwork. Local models
    // must use localhost or 127.0.0.1 — other origins require a rebuild.
    host_permissions: [
      '*://*.upwork.com/*',
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://generativelanguage.googleapis.com/*',
      'https://api.x.ai/*',
      'https://api.llama.com/*',
      'http://localhost/*',
      'http://127.0.0.1/*',
    ],
  },
});
