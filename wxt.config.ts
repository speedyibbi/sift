import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: '.',
  manifest: {
    name: 'Sift',
    description:
      'Scores Upwork job postings for fit and scam risk inline, while browsing.',
    permissions: ['storage'],
    // host_permissions let the background service worker call LLM APIs cross-origin
    // (bypassing CORS) and let the content script run on Upwork. Add a custom
    // endpoint here if the extension is pointed at a custom/self-hosted LLM.
    host_permissions: [
      '*://*.upwork.com/*',
      'https://api.openai.com/*',
      'https://api.anthropic.com/*',
      'https://generativelanguage.googleapis.com/*',
      'https://openrouter.ai/*',
      'https://api.groq.com/*',
      'http://localhost/*',
      'http://127.0.0.1/*',
    ],
  },
});
