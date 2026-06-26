import type { ExtractedJob, ProviderConfig } from '../types';

// What a single scoring request gives the model
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

export interface JobInput {
  card: ExtractedJob;
  // Full description, present on deep-dive only
  fullDescription?: string;
}
