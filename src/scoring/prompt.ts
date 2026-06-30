/** Builds the system + user prompt for scoring one job. */

import type { ExtractedJob, Profile, Rules } from '@/core';
import type { JobInput } from './types';

export const SYSTEM_PROMPT = `You are an assistant that helps a freelancer triage Upwork job postings fast.
Given the freelancer's profile and a job posting, judge: (1) how well the job fits their skills and preferences, and (2) how likely it is to be a scam or low-value/time-wasting post.

Common Upwork scam / red-flag signals to weigh:
- Pushing contact off-platform (Telegram, WhatsApp, personal email) or asking to pay/get paid outside Upwork.
- Unrealistic pay (huge budget for trivial work, or insultingly low pay for skilled work).
- Vague scope, copy-pasted boilerplate, or "easy money" framing.
- Unverified payment method, brand-new client with no spend/hires, or generic requests for personal info.
- Requests for free "test" work, or recruiting-style messages unrelated to a real deliverable.

Scoring guidance:
- fitScore 0-100: how well this matches the freelancer's skills AND stated preferences. 80+ = strong, apply now; 50-79 = plausible; <50 = weak.
- Be skeptical. If signals are missing, say so in reasons rather than inventing facts.

Respond with ONLY a JSON object, no prose, no markdown fences, in exactly this shape:
{
  "fitScore": <integer 0-100>,
  "recommendation": "apply" | "maybe" | "skip",
  "scamRisk": "low" | "medium" | "high",
  "scamFlags": [<short strings naming concrete red flags, or empty>],
  "reasons": [<2-4 short bullets: why it fits or doesn't>],
  "skillMatch": [<which of the freelancer's skills this job needs>]
}`;

function money(n: number | null, prefix = '$'): string {
  return n === null ? 'unknown' : `${prefix}${n}`;
}

function describeJob(job: ExtractedJob, full?: string): string {
  const rate =
    job.contractType === 'hourly'
      ? `Hourly ${money(job.hourlyMin)}-${money(job.hourlyMax, '')}/hr`
      : job.contractType === 'fixed'
        ? `Fixed budget ${money(job.fixedBudget)}`
        : 'Contract type unknown';

  const client = [
    `payment ${job.client.paymentVerified === null ? 'unknown' : job.client.paymentVerified ? 'verified' : 'UNVERIFIED'}`,
    `spent ${money(job.client.totalSpent)}`,
    `rating ${job.client.rating ?? 'unknown'}`,
    job.client.country ? `country ${job.client.country}` : null,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    `Title: ${job.title}`,
    `${rate} | Experience: ${job.experienceLevel ?? 'unknown'} | Proposals: ${job.proposals ?? 'unknown'}`,
    `Skills tagged: ${job.skills.length ? job.skills.join(', ') : 'none listed'}`,
    `Client: ${client}`,
    `Description: ${full ?? job.descriptionSnippet}`,
  ].join('\n');
}

function describeProfile(profile: Profile): string {
  const hasResume = Boolean(profile.resume);
  const parts: string[] = [];

  // Skills: an explicit list wins; otherwise fall back to inferring from the resume.
  if (profile.skills.length) {
    parts.push(`Skills: ${profile.skills.join(', ')}`);
  } else {
    parts.push(
      hasResume
        ? 'Skills: not listed explicitly - infer them from the resume below.'
        : 'Skills: (not specified)',
    );
  }

  if (hasResume) parts.push(`Resume / background:\n${profile.resume}`);

  // Ideal job: explicit text wins; otherwise infer their preferences from the resume.
  if (profile.idealJob) {
    parts.push(`Ideal job description:\n${profile.idealJob}`);
  } else if (hasResume) {
    parts.push(
      'Ideal job: not specified - infer their likely preferences, seniority, and domain from the resume above.',
    );
  }

  return parts.join('\n\n');
}

function describeRules(rules: Rules): string {
  const parts: string[] = [];
  if (rules.minFixedBudget > 0)
    parts.push(`min fixed budget $${rules.minFixedBudget}`);
  if (rules.minHourlyRate > 0)
    parts.push(`min hourly $${rules.minHourlyRate}/hr`);
  if (rules.requirePaymentVerified) parts.push('payment must be verified');
  if (rules.requiredKeywords.length)
    parts.push(`prefers: ${rules.requiredKeywords.join(', ')}`);
  return parts.length ? parts.join('; ') : 'no hard constraints set';
}

// Build the system+user prompt pair for one job.
export function buildScoringPrompt(
  input: JobInput,
  profile: Profile,
  rules: Rules,
  prefilterHints: string[] = [],
): { system: string; user: string } {
  const hints = prefilterHints.length
    ? `\n\nLocal prefilter already flagged: ${prefilterHints.join('; ')}.`
    : '';

  const user = [
    '## Freelancer profile',
    describeProfile(profile),
    '',
    `## Their stated constraints`,
    describeRules(rules),
    '',
    '## Job posting',
    describeJob(input.card, input.fullDescription ?? input.card.fullDescription),
    hints,
  ].join('\n');

  return { system: SYSTEM_PROMPT, user };
}
