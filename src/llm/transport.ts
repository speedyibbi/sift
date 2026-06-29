/** Provider-agnostic transport: routes a completion to the right adapter. */

import type { ProviderConfig } from '@/core';
import type { CompletionRequest, LLMAdapter } from './types';
import { openaiCompatAdapter } from './adapters/openaiCompat';
import { anthropicAdapter } from './adapters/anthropic';

function adapterFor(cfg: ProviderConfig): LLMAdapter {
  return cfg.kind === 'anthropic' ? anthropicAdapter : openaiCompatAdapter;
}

// Run one completion against the configured provider.
export function complete(req: CompletionRequest, cfg: ProviderConfig): Promise<string> {
  return adapterFor(cfg).complete(req, cfg);
}

// Minimal round-trip to verify the provider config.
export async function testConnection(cfg: ProviderConfig): Promise<void> {
  if (!cfg.apiKey) throw new Error('No API key set');
  const raw = await complete(
    {
      system: 'Reply with a single JSON object and nothing else.',
      user: 'Return {"ok": true}',
      maxTokens: 20,
      temperature: 0,
    },
    cfg,
  );
  if (!raw.includes('{')) throw new Error('Unexpected response from provider');
}
