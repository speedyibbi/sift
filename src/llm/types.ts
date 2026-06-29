/** Transport-layer types shared by the LLM adapters. */

import type { ProviderConfig } from '@/core';

// What a single completion request gives the model
export interface CompletionRequest {
  system: string;
  user: string;
  maxTokens?: number;
  temperature?: number;
}

// A provider adapter turns a prompt into raw model text
export interface LLMAdapter {
  complete(req: CompletionRequest, cfg: ProviderConfig): Promise<string>;
}
