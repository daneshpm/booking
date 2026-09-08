import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { checkRateLimit, __resetRateLimits, __trackedKeyCount } from '../lib/rate-limit';

const OPTIONS = { limit: 3, windowMs: 60_000 };

/**
 * These exercise the in-process fallback, which is what runs when REDIS_URL is
 * unset. The Redis path shares the same window semantics and is covered by the
 * integration suite.
 */
describe('rate limiter', () => {
  beforeEach(() => {
    __resetRateLimits();
    delete process.env.REDIS_URL;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests up to the limit', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await checkRateLimit('a', OPTIONS)).allowed).toBe(true);
    }
  });

  it('blocks the request past the limit', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('a', OPTIONS);
    expect((await checkRateLimit('a', OPTIONS)).allowed).toBe(false);
  });

  it('counts down the remaining allowance', async () => {
    expect((await checkRateLimit('a', OPTIONS)).remaining).toBe(2);
    expect((await checkRateLimit('a', OPTIONS)).remaining).toBe(1);
    expect((await checkRateLimit('a', OPTIONS)).remaining).toBe(0);
  });

  it('keeps separate counters per key', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('a', OPTIONS);

    // One caller exhausting their allowance must not lock everyone else out.
    expect((await checkRateLimit('a', OPTIONS)).allowed).toBe(false);
    expect((await checkRateLimit('b', OPTIONS)).allowed).toBe(true);
  });

  it('allows requests again once the window resets', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('a', OPTIONS);
    expect((await checkRateLimit('a', OPTIONS)).allowed).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect((await checkRateLimit('a', OPTIONS)).allowed).toBe(true);
  });

  it('still blocks just before the window resets', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('a', OPTIONS);

    vi.advanceTimersByTime(59_000);
    expect((await checkRateLimit('a', OPTIONS)).allowed).toBe(false);
  });

  it('reports how long to wait when blocked', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('a', OPTIONS);

    vi.advanceTimersByTime(30_000);
    const result = await checkRateLimit('a', OPTIONS);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBe(30);
  });

  it('reports no retry hint when the request was allowed', async () => {
    expect((await checkRateLimit('a', OPTIONS)).retryAfterSeconds).toBeUndefined();
  });

  it('reports a reset time in the future', async () => {
    const result = await checkRateLimit('a', OPTIONS);
    expect(result.resetAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('bounds memory when an attacker rotates the key', async () => {
    // The key comes from a client-supplied header, so rotating it evades the
    // count. Without a ceiling that would trade a rate limit for a memory
    // exhaustion vector, which is a worse deal than having no limiter.
    for (let i = 0; i < 25_000; i += 1) {
      await checkRateLimit(`rotating-${i}`, OPTIONS);
    }
    expect(__trackedKeyCount()).toBeLessThanOrEqual(20_000);
  });

  it('still enforces the limit for a steady key while others rotate', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('steady', OPTIONS);
    expect((await checkRateLimit('steady', OPTIONS)).allowed).toBe(false);

    for (let i = 0; i < 100; i += 1) await checkRateLimit(`noise-${i}`, OPTIONS);
    expect((await checkRateLimit('steady', OPTIONS)).allowed).toBe(false);
  });

  it('cannot be made to forget a blocked account by flooding the map', async () => {
    // The attack the eviction order exists to stop: rotating a client-supplied
    // header to push the per-account login counter out of the map, which is
    // the counter that stops distributed password guessing.
    const victim = 'login-account:victim@example.com';
    const longWindow = { limit: 3, windowMs: 15 * 60_000 };

    for (let i = 0; i < 3; i += 1) await checkRateLimit(victim, longWindow);
    expect((await checkRateLimit(victim, longWindow)).allowed).toBe(false);

    // Flood past the ceiling with short-lived keys, as an attacker would.
    for (let i = 0; i < 25_000; i += 1) {
      await checkRateLimit(`login:rotating-${i}`, { limit: 100, windowMs: 60_000 });
    }

    // The victim's counter outlives the flood because it expires latest.
    expect((await checkRateLimit(victim, longWindow)).allowed).toBe(false);
  });
});
