import { describe, it, expect, vi } from 'vitest';
import { readEnvInt, readEnvBool } from './env';

describe('readEnvInt', () => {
  it('returns the fallback when unset', () => {
    expect(readEnvInt('X', undefined, 4)).toBe(4);
  });

  it('parses a valid positive integer', () => {
    expect(readEnvInt('X', '8', 4)).toBe(8);
  });

  it('falls back and warns on non-numeric input', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readEnvInt('X', 'abc', 4)).toBe(4);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it('falls back and warns on zero, negative, or non-integer values', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readEnvInt('X', '0', 4)).toBe(4);
    expect(readEnvInt('X', '-1', 4)).toBe(4);
    expect(readEnvInt('X', '1.5', 4)).toBe(4);
    expect(warn).toHaveBeenCalledTimes(3);
    warn.mockRestore();
  });
});

describe('readEnvBool', () => {
  it('returns the fallback when unset', () => {
    expect(readEnvBool('X', undefined, true)).toBe(true);
  });

  it('parses "true" and "false"', () => {
    expect(readEnvBool('X', 'true', false)).toBe(true);
    expect(readEnvBool('X', 'false', true)).toBe(false);
  });

  it('falls back and warns on an unrecognized value', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(readEnvBool('X', 'yes', true)).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
