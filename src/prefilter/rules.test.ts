import { describe, it, expect } from 'vitest';
import { runPrefilter } from './rules';
import type { ExtractedJob, Rules } from '@/core';

function makeJob(p: Partial<ExtractedJob> = {}): ExtractedJob {
  return {
    id: '~01',
    url: 'https://www.upwork.com/jobs/x',
    title: 'React developer needed',
    descriptionSnippet: 'Build a React + TypeScript dashboard',
    contractType: 'hourly',
    fixedBudget: null,
    hourlyMin: 30,
    hourlyMax: 50,
    experienceLevel: 'Intermediate',
    skills: ['React'],
    proposals: 3,
    postedAt: null,
    client: {
      paymentVerified: true,
      totalSpent: 5000,
      rating: 4.9,
      country: 'US',
      totalHires: 3,
    },
    ...p,
  };
}

const baseRules: Rules = {
  requirePaymentVerified: false,
  minFixedBudget: 0,
  minHourlyRate: 0,
  allowFixed: true,
  allowHourly: true,
  minClientSpend: 0,
  minClientRating: 0,
  maxProposals: 0,
  requiredKeywords: [],
  bannedKeywords: ['telegram'],
};

describe('runPrefilter', () => {
  it('passes a clean job', () => {
    expect(runPrefilter(makeJob(), baseRules).decision).toBe('pass');
  });

  it('hard-fails on a banned keyword', () => {
    const r = runPrefilter(
      makeJob({ descriptionSnippet: 'Contact me on Telegram to start' }),
      baseRules,
    );
    expect(r.decision).toBe('fail');
    expect(r.firedRules).toContain('banned:telegram');
  });

  it('fails fixed jobs below the budget floor', () => {
    const r = runPrefilter(
      makeJob({ contractType: 'fixed', fixedBudget: 100, hourlyMin: null, hourlyMax: null }),
      { ...baseRules, minFixedBudget: 500 },
    );
    expect(r.decision).toBe('fail');
    expect(r.firedRules).toContain('budget:below-min');
  });

  it('fails when payment must be verified but is not', () => {
    const r = runPrefilter(
      makeJob({ client: { ...makeJob().client, paymentVerified: false } }),
      { ...baseRules, requirePaymentVerified: true },
    );
    expect(r.decision).toBe('fail');
  });

  it('fails hourly jobs when the contract type is excluded', () => {
    const r = runPrefilter(makeJob(), { ...baseRules, allowHourly: false });
    expect(r.decision).toBe('fail');
  });

  it('marks borderline when required keywords are missing', () => {
    const r = runPrefilter(makeJob(), { ...baseRules, requiredKeywords: ['python'] });
    expect(r.decision).toBe('borderline');
    expect(r.firedRules).toContain('missing-required-keywords');
  });

  it('marks borderline on high competition', () => {
    const r = runPrefilter(makeJob({ proposals: 40 }), { ...baseRules, maxProposals: 10 });
    expect(r.decision).toBe('borderline');
    expect(r.firedRules).toContain('high-competition');
  });
});
