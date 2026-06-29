/** A job as scraped from a feed card, optionally enriched on deep-dive. */

export type ContractType = 'fixed' | 'hourly' | 'unknown';

export interface ClientInfo {
  rating: number | null; // 0-5
  country: string | null;
  totalSpent: number | null;
  totalHires: number | null;
  paymentVerified: boolean | null;
}

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
