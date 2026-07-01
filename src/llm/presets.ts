/** Provider presets that prefill baseURL and default model. */

import type { ProviderKind } from '@/core';

export interface ProviderPreset {
  id: string;
  label: string;
  kind: ProviderKind;
  baseURL: string;
  defaultModel: string;
}

// All openai-compat providers speak the same /chat/completions schema, so a
// single adapter covers them — switching is just picking a preset + model.
// Model strings are sensible cheap defaults; edit freely in the options page.
export const PRESETS: ProviderPreset[] = [
  {
    id: 'openai',
    label: 'OpenAI (ChatGPT)',
    kind: 'openai-compat',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    kind: 'anthropic',
    baseURL: 'https://api.anthropic.com',
    defaultModel: 'claude-haiku-4-5-20251001',
  },
  {
    id: 'google',
    label: 'Google (Gemini)',
    kind: 'openai-compat',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash-lite',
  },
  {
    id: 'grok',
    label: 'xAI (Grok)',
    kind: 'openai-compat',
    baseURL: 'https://api.x.ai/v1',
    defaultModel: 'grok-3-mini',
  },
  {
    id: 'meta',
    label: 'Meta (Llama)',
    kind: 'openai-compat',
    baseURL: 'https://api.llama.com/compat/v1',
    defaultModel: 'llama-4-scout-17b-16e-instruct-fp8',
  },
  {
    id: 'local',
    label: 'Local (Ollama / LM Studio)',
    kind: 'openai-compat',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
  },
];

export function presetById(id: string): ProviderPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
