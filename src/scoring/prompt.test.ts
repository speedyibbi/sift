import { describe, it, expect } from 'vitest';
import { buildScoringPrompt } from './prompt';
import type { ExtractedJob, Profile, Rules } from '@/core';

const card: ExtractedJob = {
  id: '~001',
  url: 'https://www.upwork.com/jobs/x_~001/',
  title: 'React developer',
  descriptionSnippet: 'Build a dashboard',
  contractType: 'hourly',
  fixedBudget: null,
  hourlyMin: 40,
  hourlyMax: 60,
  experienceLevel: 'Intermediate',
  skills: ['React'],
  proposals: 5,
  postedAt: '2 hours ago',
  client: { paymentVerified: true, totalSpent: 1000, rating: 4.9, country: 'US', totalHires: 3 },
};

const rules: Rules = {
  requirePaymentVerified: false,
  minFixedBudget: 0,
  minHourlyRate: 0,
  allowFixed: true,
  allowHourly: true,
  minClientSpend: 0,
  minClientRating: 0,
  maxProposals: 0,
  requiredKeywords: [],
  bannedKeywords: [],
};

const profile = (p: Partial<Profile>): Profile => ({ resume: '', idealJob: '', skills: [], ...p });

describe('buildScoringPrompt — profile fallback', () => {
  it('uses an explicit skills list when present', () => {
    const { user } = buildScoringPrompt({ card }, profile({ skills: ['Go', 'Rust'] }), rules);
    expect(user).toContain('Skills: Go, Rust');
  });

  it('falls back to the resume for skills when none are listed', () => {
    const { user } = buildScoringPrompt(
      { card },
      profile({ resume: 'Senior engineer, 10y React' }),
      rules,
    );
    expect(user).toContain('infer them from the resume');
    expect(user).not.toContain('(not specified)');
    expect(user).toContain('Senior engineer, 10y React');
  });

  it('falls back to the resume for the ideal job when not described', () => {
    const { user } = buildScoringPrompt({ card }, profile({ resume: 'Backend specialist' }), rules);
    expect(user).toContain('infer their likely preferences');
  });

  it('marks skills "(not specified)" only when there is no resume either', () => {
    const { user } = buildScoringPrompt({ card }, profile({}), rules);
    expect(user).toContain('Skills: (not specified)');
  });
});
