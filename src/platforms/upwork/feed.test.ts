import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { extractFeedCards, parseMoney } from './feed';

const html = readFileSync(resolve(process.cwd(), 'test/fixtures/feed.html'), 'utf8');

function parse() {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return extractFeedCards(doc);
}

describe('extractFeedCards', () => {
  it('finds every job tile', () => {
    expect(parse()).toHaveLength(3);
  });

  it('parses an hourly job with full client signals', () => {
    const job = parse()[0]!.job;
    expect(job.title).toBe('Senior React Developer for SaaS dashboard');
    expect(job.id).toBe('~021111111111111111');
    expect(job.url).toBe(
      'https://www.upwork.com/jobs/Senior-React-Developer_~021111111111111111/?from=feed',
    );
    expect(job.contractType).toBe('hourly');
    expect(job.hourlyMin).toBe(40);
    expect(job.hourlyMax).toBe(60);
    expect(job.experienceLevel).toBe('Intermediate');
    expect(job.skills).toEqual(['React', 'TypeScript', 'GraphQL']);
    expect(job.proposals).toBe(10);
    expect(job.client).toMatchObject({
      paymentVerified: true,
      totalSpent: 20000,
      rating: 4.95,
      country: 'United States',
    });
  });

  it('parses a fixed-price job and unverified payment', () => {
    const job = parse()[1]!.job;
    expect(job.contractType).toBe('fixed');
    expect(job.fixedBudget).toBe(150);
    expect(job.experienceLevel).toBe('Entry level');
    expect(job.client.paymentVerified).toBe(false);
    expect(job.proposals).toBe(5);
  });

  it('parses low hourly rates on the scam tile', () => {
    const job = parse()[2]!.job;
    expect(job.contractType).toBe('hourly');
    expect(job.hourlyMin).toBe(3);
    expect(job.hourlyMax).toBe(5);
  });
});

describe('parseMoney', () => {
  it('handles plain, comma, and K/M suffixes', () => {
    expect(parseMoney('$150')).toBe(150);
    expect(parseMoney('$1,200+ spent')).toBe(1200);
    expect(parseMoney('$20K+ spent')).toBe(20000);
    expect(parseMoney('$1.5M')).toBe(1500000);
    expect(parseMoney('no money')).toBeNull();
  });
});
