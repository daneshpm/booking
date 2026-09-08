import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, __resetRateLimits } from '../lib/rate-limit';

const OPTIONS = { limit: 3, windowMs: 60_000 };

describe('rate limiter', () => {
  beforeEach(() => {
    __resetRateLimits();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', () => {
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit('a', OPTIONS).allowed).toBe(true);
    }
  });

  it('blocks the request past the limit', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', OPTIONS);
    expect(checkRateLimit('a', OPTIONS).allowed).toBe(false);
  });

  it('counts down the remaining allowance', () => {
    expect(checkRateLimit('a', OPTIONS).remaining).toBe(2);
    expect(checkRateLimit('a', OPTIONS).remaining).toBe(1);
    expect(checkRateLimit('a', OPTIONS).remaining).toBe(0);
  });

  it('keeps separate counters per key', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', OPTIONS);

    // One caller exhausting their allowance must not lock everyone else out.
    expect(checkRateLimit('a', OPTIONS).allowed).toBe(false);
    expect(checkRateLimit('b', OPTIONS).allowed).toBe(true);
  });

  it('allows requests again once the window resets', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', OPTIONS);
    expect(checkRateLimit('a', OPTIONS).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit('a', OPTIONS).allowed).toBe(true);
  });

  it('still blocks just before the window resets', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', OPTIONS);

    vi.advanceTimersByTime(59_000);
    expect(checkRateLimit('a', OPTIONS).allowed).toBe(false);
  });

  it('reports how long to wait when blocked', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', OPTIONS);

    vi.advanceTimersByTime(30_000);
    const result = checkRateLimit('a', OPTIONS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(30);
  });

  it('reports no retry hint when the request was allowed', () => {
    expect(checkRateLimit('a', OPTIONS).retryAfterSeconds).toBeUndefined();
  });

  it('reports a reset time in the future', () => {
    const result = checkRateLimit('a', OPTIONS);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });
});
