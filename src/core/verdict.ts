/** The fit/scam judgement rendered on a job's badge. */

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
