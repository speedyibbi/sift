import type { ProviderConfig } from '@/core';
import type { CompletionRequest, LLMAdapter } from '../types';

/**
 * Universal adapter for any endpoint speaking the OpenAI Chat Completions
 * schema: OpenAI, Gemini (compat endpoint), OpenRouter, Groq, Ollama/LM Studio.
 *
 * We deliberately do NOT send `response_format: json_object` — support for it
 * varies across these providers and is a common source of cross-provider
 * errors. Instead the prompt demands JSON and `parseVerdict` extracts it
 * robustly. That keeps "switch model seamlessly" actually seamless.
 */
export const openaiCompatAdapter: LLMAdapter = {
  async complete(req: CompletionRequest, cfg: ProviderConfig): Promise<string> {
    const base = cfg.baseURL.replace(/\/+$/, '');
    if (!base) throw new Error('No base URL configured for this provider');

    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        temperature: req.temperature ?? 0,
        max_tokens: req.maxTokens ?? 700,
        messages: [
          { role: 'system', content: req.system },
          { role: 'user', content: req.user },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`LLM HTTP ${res.status}: ${body.slice(0, 300)}`);
    }

    const raw = await res.text();
    let data: {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
    };
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`LLM returned non-JSON (HTTP 200): ${raw.slice(0, 200)}`);
    }
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      const finish = data.choices?.[0]?.finish_reason ?? 'none';
      throw new Error(
        `LLM returned no content (finish_reason: ${finish}). Raw: ${raw.slice(0, 250)}`,
      );
    }
    return content;
  },
};
