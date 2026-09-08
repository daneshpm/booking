import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { createClient } from 'redis';

/**
 * The Redis-backed rate limiter.
 *
 * The in-process fallback is covered by unit tests. This exercises the path
 * that actually runs in a multi-instance deployment, where a limit must hold
 * across processes rather than multiplying by the instance count.
 *
 * Skipped when REDIS_URL is unset, so the suite still runs on a machine
 * without Redis.
 */
const REDIS_URL = process.env.REDIS_URL;
const describeRedis = REDIS_URL ? describe : describe.skip;

describeRedis('redis rate limiter', () => {
  let checkRateLimit: typeof import('../../lib/rate-limit').checkRateLimit;
  let isDistributedRateLimiting: typeof import('../../lib/rate-limit').isDistributedRateLimiting;
  let admin: ReturnType<typeof createClient>;

  const OPTIONS = { limit: 3, windowMs: 60_000 };

  beforeAll(async () => {
    const mod = await import('../../lib/rate-limit');
    checkRateLimit = mod.checkRateLimit;
    isDistributedRateLimiting = mod.isDistributedRateLimiting;

    admin = createClient({ url: REDIS_URL });
    await admin.connect();
  });

  afterAll(async () => {
    if (admin?.isOpen) await admin.quit();
  });

  beforeEach(async () => {
    const keys = await admin.keys('ratelimit:*');
    if (keys.length > 0) await admin.del(keys);
  });

  it('reports that limits are shared once Redis is connected', async () => {
    await checkRateLimit('probe', OPTIONS);
    expect(isDistributedRateLimiting()).toBe(true);
  });

  it('allows requests up to the limit', async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await checkRateLimit('within', OPTIONS)).allowed).toBe(true);
    }
  });

  it('blocks the request past the limit', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('over', OPTIONS);
    expect((await checkRateLimit('over', OPTIONS)).allowed).toBe(false);
  });

  it('counts down the remaining allowance', async () => {
    expect((await checkRateLimit('countdown', OPTIONS)).remaining).toBe(2);
    expect((await checkRateLimit('countdown', OPTIONS)).remaining).toBe(1);
    expect((await checkRateLimit('countdown', OPTIONS)).remaining).toBe(0);
  });

  it('keeps separate counters per key', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('busy', OPTIONS);
    expect((await checkRateLimit('busy', OPTIONS)).allowed).toBe(false);
    expect((await checkRateLimit('quiet', OPTIONS)).allowed).toBe(true);
  });

  it('gives the key an expiry, so a window cannot last forever', async () => {
    await checkRateLimit('expiring', OPTIONS);
    const ttl = await admin.ttl('ratelimit:expiring');
    // -1 means the key has no expiry at all, which would jam that caller out
    // permanently once they hit the limit.
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
  });

  it('reports a reset time drawn from the real remaining window', async () => {
    // Regression: reading the EXPIRE reply instead of the TTL reported a
    // one-second window, so a blocked caller was told to retry immediately.
    const first = await checkRateLimit('reset-window', OPTIONS);
    const secondsAway = Math.round((first.resetAt.getTime() - Date.now()) / 1000);
    expect(secondsAway).toBeGreaterThan(30);
  });

  it('reports a sensible retry hint when blocked', async () => {
    for (let i = 0; i < 3; i += 1) await checkRateLimit('retry-hint', OPTIONS);
    const blocked = await checkRateLimit('retry-hint', OPTIONS);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(30);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('does not extend the window on later requests in it', async () => {
    await checkRateLimit('fixed-window', OPTIONS);
    const firstTtl = await admin.ttl('ratelimit:fixed-window');

    await checkRateLimit('fixed-window', OPTIONS);
    const secondTtl = await admin.ttl('ratelimit:fixed-window');

    // EXPIRE is set NX, so the window is fixed rather than sliding.
    expect(secondTtl).toBeLessThanOrEqual(firstTtl);
  });

  it('shares the count across separate callers of the limiter', async () => {
    // Two instances behind a load balancer see one budget, not one each.
    await Promise.all([
      checkRateLimit('shared', OPTIONS),
      checkRateLimit('shared', OPTIONS),
      checkRateLimit('shared', OPTIONS),
    ]);

    expect((await checkRateLimit('shared', OPTIONS)).allowed).toBe(false);
    expect(Number(await admin.get('ratelimit:shared'))).toBeGreaterThanOrEqual(3);
  });
});
