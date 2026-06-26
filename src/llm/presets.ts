import type { ProviderKind } from '../types';

export interface ProviderPreset {
  id: string;
  label: string;
  kind: ProviderKind;
  baseURL: string;
  defaultModel: string;
  /** Where the user gets an API key, shown in the options page. */
  keyHint: string;
}

// All openai-compat providers speak the same /chat/completions schema, so a
// single adapter covers them — switching is just picking a preset + model.
// Model strings are sensible cheap defaults; edit freely in the options page.
export const PRESETS: ProviderPreset[] = [
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    kind: 'anthropic',
    baseURL: 'https://api.anthropic.com',
    defaultModel: 'claude-haiku-4-5-20251001',
    keyHint: 'console.anthropic.com -> API Keys',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-compat',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    keyHint: 'platform.openai.com -> API keys',
  },
  {
    id: 'gemini',
    label: 'Google Gemini (OpenAI-compatible)',
    kind: 'openai-compat',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.0-flash',
    keyHint: 'aistudio.google.com -> Get API key (has a free tier)',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai-compat',
    baseURL: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini',
    keyHint: 'openrouter.ai -> Keys',
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'openai-compat',
    baseURL: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-8b-instant',
    keyHint: 'console.groq.com -> API Keys',
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    kind: 'openai-compat',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1',
    keyHint: 'No key needed for local Ollama (enter "ollama")',
  },
  {
    id: 'custom',
    label: 'Custom (OpenAI-compatible)',
    kind: 'openai-compat',
    baseURL: '',
    defaultModel: '',
    keyHint: 'Your own OpenAI-compatible endpoint',
  },
];

export function presetById(id: string): ProviderPreset | undefined {
  return PRESETS.find((p) => p.id === id);
}
