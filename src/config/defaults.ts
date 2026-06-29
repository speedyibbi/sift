/** Default settings applied on first run and as fallbacks for omitted fields. */

import type { Profile, Rules, ProviderConfig, Settings } from '@/core';
import { presetById } from '@/llm';

export const DEFAULT_RULES: Rules = {
  requirePaymentVerified: false,
  minFixedBudget: 0,
  minHourlyRate: 0,
  allowFixed: true,
  allowHourly: true,
  minClientSpend: 0,
  minClientRating: 0,
  maxProposals: 0,
  requiredKeywords: [],
  // Conservative starter list of classic Upwork scam / low-value signals.
  bannedKeywords: [
    'telegram',
    'whatsapp',
    'gmail.com',
    'crypto giveaway',
    'data entry $',
    'send your details',
    'contact me outside',
  ],
};

export const DEFAULT_PROFILE: Profile = {
  resume: '',
  idealJob: '',
  skills: [],
};

// Default to the Google Gemini preset.
const geminiPreset = presetById('gemini')!;

export const DEFAULT_PROVIDER: ProviderConfig = {
  kind: geminiPreset.kind,
  baseURL: geminiPreset.baseURL,
  model: geminiPreset.defaultModel,
  apiKey: '',
};

export const DEFAULT_SETTINGS: Settings = {
  provider: DEFAULT_PROVIDER,
  rules: DEFAULT_RULES,
  profile: DEFAULT_PROFILE,
  cacheTtlHours: 3,
};
