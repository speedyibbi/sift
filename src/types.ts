/**
 * Shared domain types
 */

export type ContractType = 'fixed' | 'hourly' | 'unknown';

export interface ClientInfo {
  rating: number | null; // 0-5
  country: string | null;
  totalSpent: number | null;
  totalHires: number | null;
  paymentVerified: boolean | null;
}

// A single job as scraped from a feed card (or enriched from the detail page)
export interface ExtractedJob {
  id: string; // Upwork job ciphertext if found, else a hash of the URL
  url: string;
  title: string;
  descriptionSnippet: string;
  fullDescription?: string; // populated only on deep-dive
  contractType: ContractType;
  fixedBudget: number | null;
  hourlyMin: number | null;
  hourlyMax: number | null;
  experienceLevel: string | null;
  skills: string[];
  proposals: number | null;
  postedAt: string | null;
  client: ClientInfo;
}

// ----- User preferences -----

// Structured rules that drive the local prefilter
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

// ----- LLM provider configuration -----

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

// ----- Verdicts -----

export type Recommendation = 'apply' | 'maybe' | 'skip' | 'filtered';
export type ScamRisk = 'low' | 'medium' | 'high';

export interface JobVerdict {
  jobId: string;
  source: 'prefilter' | 'llm' | 'llm-deep';
  fitScore: number; // 0-100
  recommendation: Recommendation;
  scamRisk: ScamRisk;
  scamFlags: string[];
  reasons: string[];
  skillMatch: string[];
  cachedAt: number;
}

// ----- Messaging (content script <-> background) -----

export type Message =
  | { type: 'SCORE_JOB'; job: ExtractedJob; hints?: string[]; force?: boolean } // force = bypass the cache (manual re-score)
  | { type: 'DEEP_DIVE'; job: ExtractedJob; hints?: string[] } // job.fullDescription already filled in by the content script
  | { type: 'TEST_CONNECTION' };

export type ScoreResponse =
  | { ok: true; verdict: JobVerdict }
  | { ok: false; error: string };

export type TestResponse = { ok: true } | { ok: false; error: string };
