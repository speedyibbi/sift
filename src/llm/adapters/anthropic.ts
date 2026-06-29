import type { ProviderConfig } from '@/core';
import type { CompletionRequest, LLMAdapter } from '../types';

/**
 * Native Anthropic Messages API adapter. The
 * `anthropic-dangerous-direct-browser-access` header is required for calls made
 * from a browser origin (the extension background worker); without it Anthropic
 * blocks the request via CORS. The key still lives only in extension storage.
 */
export const anthropicAdapter: LLMAdapter = {
  async complete(req: CompletionRequest, cfg: ProviderConfig): Promise<string> {
    const base = (cfg.baseURL || 'https://api.anthropic.com').replace(/\/+$/, '');

    const res = await fetch(`${base}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': cfg.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: cfg.model,
        max_tokens: req.maxTokens ?? 700,
        temperature: req.temperature ?? 0,
        system: req.system,
        messages: [{ role: 'user', content: req.user }],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const data = (await res.json()) as { content?: { text?: string }[] };
    const text = data.content?.map((c) => c.text ?? '').join('');
    if (!text) throw new Error('LLM returned an empty response');
    return text;
  },
};
