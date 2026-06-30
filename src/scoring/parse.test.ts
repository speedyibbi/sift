import { describe, it, expect } from 'vitest';
import { parseVerdict, extractJsonObject } from './parse';

const CLEAN = JSON.stringify({
  fitScore: 82,
  recommendation: 'apply',
  scamRisk: 'low',
  scamFlags: [],
  reasons: ['Strong React match', 'Budget is healthy'],
  skillMatch: ['React', 'TypeScript'],
});

describe('extractJsonObject', () => {
  it('handles nested braces', () => {
    expect(extractJsonObject('prefix {"a":{"b":1}} suffix')).toBe('{"a":{"b":1}}');
  });
  it('ignores braces inside strings', () => {
    expect(extractJsonObject('{"a":"}{"}')).toBe('{"a":"}{"}');
  });
  it('returns null when absent', () => {
    expect(extractJsonObject('no object here')).toBeNull();
  });
});

describe('parseVerdict', () => {
  it('parses a clean object', () => {
    const v = parseVerdict(CLEAN);
    expect(v.fitScore).toBe(82);
    expect(v.recommendation).toBe('apply');
    expect(v.scamRisk).toBe('low');
    expect(v.skillMatch).toEqual(['React', 'TypeScript']);
  });

  it('strips markdown fences', () => {
    expect(parseVerdict('```json\n' + CLEAN + '\n```').fitScore).toBe(82);
  });

  it('ignores surrounding prose', () => {
    expect(parseVerdict(`Sure! ${CLEAN} Hope that helps.`).recommendation).toBe('apply');
  });

  it('clamps the fit score to 0-100', () => {
    expect(parseVerdict('{"fitScore":150}').fitScore).toBe(100);
    expect(parseVerdict('{"fitScore":-20}').fitScore).toBe(0);
  });

  it('coerces invalid enums to safe defaults', () => {
    const v = parseVerdict('{"recommendation":"definitely","scamRisk":"nuclear"}');
    expect(v.recommendation).toBe('maybe');
    expect(v.scamRisk).toBe('low');
  });

  it('accepts snake_case keys', () => {
    const v = parseVerdict('{"fit_score":70,"scam_risk":"high","skill_match":["Go"]}');
    expect(v.fitScore).toBe(70);
    expect(v.scamRisk).toBe('high');
    expect(v.skillMatch).toEqual(['Go']);
  });

  it('throws when there is no JSON at all', () => {
    expect(() => parseVerdict('the model refused')).toThrow();
  });
});
