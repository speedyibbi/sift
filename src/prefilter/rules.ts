/** Prefilter — turns a job + rules into pass | borderline | fail. */

import type { ExtractedJob, Rules } from '@/core';

export type PrefilterDecision = 'pass' | 'borderline' | 'fail';

export interface PrefilterResult {
  decision: PrefilterDecision;
  // Identifiers of the rules that fired, for debugging/telemetry.
  firedRules: string[];
  // Human-readable reasons, passed to the LLM as hints.
  reasons: string[];
}

function haystack(job: ExtractedJob): string {
  return [job.title, job.descriptionSnippet, job.skills.join(' ')]
    .join(' ')
    .toLowerCase();
}

/**
 * Network-free triage over a single job. A hard `fail` short-circuits the
 * LLM entirely; `pass` and `borderline` are forwarded for scoring,
 * with `borderline` reasons handed to the model as hints.
 */
export function runPrefilter(job: ExtractedJob, rules: Rules): PrefilterResult {
  const fired: string[] = [];
  const fails: string[] = [];
  const softs: string[] = [];
  const text = haystack(job);

  // --- Hard fails (obvious junk / clear preference violations) ---

  for (const kw of rules.bannedKeywords) {
    const needle = kw.trim().toLowerCase();
    if (needle && text.includes(needle)) {
      fired.push(`banned:${needle}`);
      fails.push(`Contains banned phrase "${kw}"`);
    }
  }

  if (rules.requirePaymentVerified && job.client.paymentVerified === false) {
    fired.push('payment-unverified');
    fails.push('Client payment method is not verified');
  }

  if (!rules.allowFixed && job.contractType === 'fixed') {
    fired.push('contract:fixed-excluded');
    fails.push('Fixed-price jobs are excluded');
  }
  if (!rules.allowHourly && job.contractType === 'hourly') {
    fired.push('contract:hourly-excluded');
    fails.push('Hourly jobs are excluded');
  }

  if (
    rules.minFixedBudget > 0 &&
    job.contractType === 'fixed' &&
    job.fixedBudget !== null &&
    job.fixedBudget < rules.minFixedBudget
  ) {
    fired.push('budget:below-min');
    fails.push(
      `Budget $${job.fixedBudget} is below your $${rules.minFixedBudget} minimum`,
    );
  }

  if (
    rules.minHourlyRate > 0 &&
    job.contractType === 'hourly' &&
    job.hourlyMax !== null &&
    job.hourlyMax < rules.minHourlyRate
  ) {
    fired.push('rate:below-min');
    fails.push(
      `Top rate $${job.hourlyMax}/hr is below your $${rules.minHourlyRate}/hr minimum`,
    );
  }

  if (
    rules.minClientSpend > 0 &&
    job.client.totalSpent !== null &&
    job.client.totalSpent < rules.minClientSpend
  ) {
    fired.push('client:low-spend');
    fails.push(
      `Client has spent $${job.client.totalSpent} (< $${rules.minClientSpend})`,
    );
  }

  if (
    rules.minClientRating > 0 &&
    job.client.rating !== null &&
    job.client.rating < rules.minClientRating
  ) {
    fired.push('client:low-rating');
    fails.push(
      `Client rating ${job.client.rating} is below ${rules.minClientRating}`,
    );
  }

  // --- Soft flags (let the LLM make the call, but flag for the badge/prompt) ---

  if (rules.requiredKeywords.length > 0) {
    const hasRequired = rules.requiredKeywords.some((kw) => {
      const needle = kw.trim().toLowerCase();
      return needle && text.includes(needle);
    });
    if (!hasRequired) {
      fired.push('missing-required-keywords');
      softs.push('None of your required keywords appear in the listing');
    }
  }

  if (
    rules.maxProposals > 0 &&
    job.proposals !== null &&
    job.proposals > rules.maxProposals
  ) {
    fired.push('high-competition');
    softs.push(`High competition: ${job.proposals} proposals already`);
  }

  if (fails.length > 0) {
    return { decision: 'fail', firedRules: fired, reasons: fails };
  }
  if (softs.length > 0) {
    return { decision: 'borderline', firedRules: fired, reasons: softs };
  }
  return { decision: 'pass', firedRules: fired, reasons: [] };
}
