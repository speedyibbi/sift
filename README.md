# Sift

A Chromium extension that scores Upwork job postings for **fit** and
**scam risk** inline, as the user browses — so the junk can be skipped without opening
every listing.

- **Local prefilter** (rules) drops obvious junk.
- **LLM scoring** (provider-agnostic) judges fit/scam on the survivors.
- **On-demand deep-dive** renders a job's full listing for a thorough verdict.
- Runs entirely in the user's own logged-in browser session — no servers, no scraping  
bots, no login automation.

## How it works

```
Upwork feed (user logged in)
  -> content script extracts each job card
  -> prefilter: hard-fail = filtered badge, no LLM
  -> survivors -> background worker -> LLM -> fit/scam verdict
  -> badge injected on the card; click the deep-dive option to render the full listing
     in a hidden iframe for a deeper verdict
```

The background service worker owns the LLM call (centralizes the API key,  
handles CORS via host permissions, caps concurrency, caches verdicts). The deep-dive  
render+parse runs in the content script, because MV3 workers have no `DOMParser`.  
A plain `fetch` of the job page is blocked by Upwork's bot protection, so the  
content script instead loads it in a hidden same-origin iframe — a real navigation,  
which passes — and parses the live DOM once the description renders.

## Setup

```bash
npm install        # also runs `wxt prepare`
npm run dev        # launches Chromium with the extension + HMR
```

Then open the extension's **Options** page and set:

1. **LLM provider** — pick a preset (OpenAI, Anthropic, Google, xAI,
  Meta, or **Local** for Ollama/LM Studio on this machine), a model, and
  the API key. The key is stored in `storage.local` and never leaves the user's
  machine. Hit **Test connection**.
2. **Prefilter rules** — budgets, client thresholds, required/banned keywords.
3. **Profile** — skills, resume, and ideal-job description (this is what
  the LLM judges fit against).

Switching models later is just changing the preset/model in Options.

## Build & test

```bash
npm run build      # production build -> .output/
npm run compile    # typecheck (wxt prepare + tsc --noEmit)
npm test           # vitest: extractor, prefilter, JSON parsing
```

Load `.output/chrome-mv3/` via `chrome://extensions` → *Load unpacked* (or use
`npm run dev`).

## Tuning the extractor (the fragile part)

All brittle DOM knowledge lives in `src/platforms/upwork/` — `feed.ts`
(`SELECTORS`) for the feed cards, `detail.ts` for the deep-dive job page. Upwork
changes its markup periodically; if badges stop appearing, open the feed in
DevTools, find the current job-card wrapper attribute, update `SELECTORS.tile`
(and the per-field selectors), and refresh `test/fixtures/feed.html` to match.
The fixtures encode the extraction *contract*, not a guarantee about live markup.

Adding a second platform means adding a new `src/platforms/<site>/` implementing
the same `Platform` contract.

## Note on Upwork's Terms

This tool only reads and annotates pages the user is already logged in and  
authorized to view, and only loads a full job page when the deep-dive option is clicked.  
It does not automate login, scrape in the background, or run on its own. The extension is  
configured so that the user doesn't get flagged but it is not a guarantee; use it responsibly.
