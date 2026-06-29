/** User-configured prefilter rules, profile, and LLM provider settings. */

// ----- Prefilter rules -----

export interface Rules {
  requirePaymentVerified: boolean;
  minFixedBudget: number; // 0 = no minimum
  minHourlyRate: number; // 0 = no minimum
  allowFixed: boolean;
  allowHourly: boolean;
  minClientSpend: number; // 0 = no minimum
  minClientRating: number; // 0 = no minimum
  maxProposals: number; // 0 = no cap
  requiredKeywords: string[]; // at least one must appear (soft -> borderline)
  bannedKeywords: string[]; // any appearance -> hard fail
}

// Freeform context handed to the LLM for nuanced fit judgement
export interface Profile {
  resume: string;
  idealJob: string;
  skills: string[];
}

// ----- LLM provider -----

export type ProviderKind = 'openai-compat' | 'anthropic';

export interface ProviderConfig {
  kind: ProviderKind;
  baseURL: string;
  model: string;
  apiKey: string;
}

export interface Settings {
  provider: ProviderConfig;
  rules: Rules;
  profile: Profile;
  cacheTtlHours: number; // how long an LLM verdict is re-used; 0 = no caching
}
