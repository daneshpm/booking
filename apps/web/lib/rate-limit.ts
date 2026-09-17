import { createClient, type RedisClientType } from 'redis';

/**
 * Fixed-window rate limiter.
 *
 * Backed by Redis when REDIS_URL is set, so a limit holds across every instance
 * behind a load balancer. Without Redis it falls back to a per-process counter,
 * which protects a single-instance deployment and is what the shipped
 * Dockerfile produces on its own.
 *
 * The key is derived from a client-supplied header, so an attacker can rotate
 * it and evade the count. The in-memory map is therefore hard-capped: without a
 * ceiling, key rotation would turn this into a memory-exhaustion vector rather
 * than a defence. Treat it as a strong deterrent against ordinary abuse, not as
 * an authentication boundary.
 */

export interface RateLimitResult {
  allowed: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** When the current window resets. */
  resetAt: Date;
  /** Seconds until the window resets. Present only when the limit was hit. */
  retryAfterSeconds?: number;
}

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Hard ceiling on tracked keys in the in-memory fallback.
 *
 * Reached only under key rotation, which already evades the count, so evicting
 * the oldest entries costs nothing an attacker was not already getting.
 */
const MAX_TRACKED_KEYS = 20_000;

/**
 * Keys removed each time the ceiling is reached.
 *
 * Evicting one at a time would re-sort the whole map on every request once it
 * is full, turning the protection into its own bottleneck.
 */
const EVICTION_BATCH = 2_000;

/** Insertion order is iteration order for a Map, so the oldest keys come first. */
const buckets = new Map<string, Window>();

function evictExpired(now: number): number {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
  return buckets.size;
}

function enforceCeiling(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;
  if (evictExpired(now) < MAX_TRACKED_KEYS) return;

  /*
   * Evict whatever expires soonest rather than whatever was inserted first.
   *
   * Insertion order would drop the oldest live counter, and an attacker
   * rotating a client-supplied header could use that to push out the
   * per-account login bucket, which is exactly the counter that stops
   * distributed password guessing. Dropping by imminent expiry costs an
   * attacker their own freshest counters instead.
   *
   * A batch is evicted rather than a single entry, so the sort is paid once
   * per batch instead of on every request once the map is full.
   */
  const byExpiry = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  const target = Math.max(buckets.size - MAX_TRACKED_KEYS + 1, EVICTION_BATCH);

  for (let i = 0; i < target && i < byExpiry.length; i += 1) {
    buckets.delete(byExpiry[i][0]);
  }
}

/** In-process counter. Also the fallback when Redis is unreachable. */
function checkInMemory(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (!existing) enforceCeiling(now);
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.limit - 1, resetAt: new Date(resetAt) };
  }

  if (existing.count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.resetAt),
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: options.limit - existing.count,
    resetAt: new Date(existing.resetAt),
  };
}

let redis: RedisClientType | null = null;
/** In-flight connection, so concurrent callers share one attempt. */
let connecting: Promise<RedisClientType | null> | null = null;
/** When to next retry after a failure, rather than giving up for good. */
let retryConnectionAfter = 0;

/** How long to use the local fallback before trying Redis again. */
const RECONNECT_BACKOFF_MS = 30_000;

/**
 * Connect to Redis once, lazily.
 *
 * A failure here is not fatal: the limiter degrades to the in-process counter
 * rather than rejecting traffic or crashing a request.
 */
async function getRedis(): Promise<RedisClientType | null> {
  if (redis?.isOpen) return redis;

  const url = process.env.REDIS_URL;
  if (!url) return null;

  // A blip at boot must not downgrade the instance to per-process limits for
  // the rest of its life, so failures back off rather than latching.
  if (Date.now() < retryConnectionAfter) return null;

  // Concurrent cold-start requests share one attempt. Without this each would
  // build its own client and leak all but the last, each retrying forever.
  connecting ??= (async () => {
    let client: RedisClientType | null = null;
    try {
      client = createClient({
        url,
        socket: {
          connectTimeout: 3000,
          reconnectStrategy: (retries) => Math.min(retries * 200, 5000),
        },
      }) as RedisClientType;

      // Without a listener an emitted error would take the process down.
      client.on('error', (err) => {
        console.error('Rate limiter Redis error:', err instanceof Error ? err.message : err);
      });

      await client.connect();
      redis = client;
      return redis;
    } catch (err) {
      console.error(
        'Rate limiter could not reach Redis, using per-instance limits for now:',
        err instanceof Error ? err.message : err
      );
      // Release the half-built client rather than leaving it reconnecting.
      try {
        client?.destroy();
      } catch {
        /* already closed or never opened */
      }
      retryConnectionAfter = Date.now() + RECONNECT_BACKOFF_MS;
      return null;
    } finally {
      connecting = null;
    }
  })();

  return connecting;
}

/**
 * Count a request in Redis.
 *
 * INCR then EXPIRE on first use gives a fixed window shared by every instance.
 * The two commands run in one pipeline so a crash between them cannot leave a
 * key without a expiry.
 */
async function checkRedis(
  client: RedisClientType,
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const namespaced = `ratelimit:${key}`;
  const ttlSeconds = Math.ceil(options.windowMs / 1000);

  // exec() returns one reply per queued command, in order: INCR, EXPIRE, TTL.
  // The middle reply is EXPIRE's own result, not the time to live, so the TTL
  // must be read from the third position.
  const replies = (await client
    .multi()
    .incr(namespaced)
    .expire(namespaced, ttlSeconds, 'NX')
    .ttl(namespaced)
    .exec()) as unknown as unknown[];

  const count = Number(replies[0]);
  const reportedTtl = Number(replies[2]);

  // TTL answers -1 for a key with no expiry and -2 when it is already gone;
  // neither is a usable window length.
  const remainingTtl = Number.isFinite(reportedTtl) && reportedTtl > 0 ? reportedTtl : ttlSeconds;
  const resetAt = new Date(Date.now() + remainingTtl * 1000);

  if (count > options.limit) {
    return { allowed: false, remaining: 0, resetAt, retryAfterSeconds: remainingTtl };
  }

  return { allowed: true, remaining: Math.max(0, options.limit - count), resetAt };
}

/**
 * Record one request against `key` and report whether it is allowed.
 *
 * The window is fixed rather than sliding: simpler, and adequate for abuse
 * control where exact boundary behaviour does not matter.
 */
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const client = await getRedis();
  if (!client) return checkInMemory(key, options);

  try {
    return await checkRedis(client, key, options);
  } catch (err) {
    // A Redis hiccup must not fail the request; the local counter still applies.
    console.error(
      'Rate limiter Redis command failed, using per-instance limits:',
      err instanceof Error ? err.message : err
    );
    return checkInMemory(key, options);
  }
}

/** True when limits are shared across instances rather than per-process. */
export function isDistributedRateLimiting(): boolean {
  return Boolean(redis?.isOpen);
}

/** Number of keys currently tracked in memory. Used by tests. */
export function __trackedKeyCount(): number {
  return buckets.size;
}

/**
 * Clear every counter. Used by tests.
 *
 * Clears Redis as well as the local map: clearing only one leaves a suite
 * tripping limits it thought it had reset.
 */
export async function __resetRateLimits(): Promise<void> {
  buckets.clear();
  retryConnectionAfter = 0;

  if (!process.env.REDIS_URL) return;

  const client = await getRedis();
  if (!client) return;

  const keys = await client.keys('ratelimit:*').catch(() => [] as string[]);
  if (keys.length > 0) await client.del(keys).catch(() => undefined);
}

/**
 * Limits for the public, unauthenticated booking endpoints.
 *
 * Booking creation is tighter than availability lookups: it writes rows and
 * sends messages, whereas a lookup only reads.
 */
export const PUBLIC_BOOKING_LIMIT: RateLimitOptions = { limit: 10, windowMs: 60 * 60 * 1000 };
export const PUBLIC_AVAILABILITY_LIMIT: RateLimitOptions = { limit: 120, windowMs: 60 * 1000 };

/**
 * Limits for authentication.
 *
 * Verifying a password costs roughly 250 ms of CPU at bcrypt cost 12, and the
 * unknown-account path deliberately spends the same to avoid leaking which
 * addresses are registered. Without a cap, a handful of concurrent clients
 * could saturate the server, so throttling here is mandatory rather than
 * optional.
 */
export const LOGIN_LIMIT: RateLimitOptions = { limit: 10, windowMs: 15 * 60 * 1000 };
export const LOGIN_PER_ACCOUNT_LIMIT: RateLimitOptions = { limit: 10, windowMs: 15 * 60 * 1000 };
export const SIGNUP_LIMIT: RateLimitOptions = { limit: 5, windowMs: 60 * 60 * 1000 };
export const PASSWORD_CHANGE_LIMIT: RateLimitOptions = { limit: 5, windowMs: 15 * 60 * 1000 };

/**
 * Password reset requests.
 *
 * Each one sends an email, so the cap is low and applies per address as well as
 * per caller.
 */
export const PASSWORD_RESET_LIMIT: RateLimitOptions = { limit: 5, windowMs: 60 * 60 * 1000 };
export const PASSWORD_RESET_PER_ACCOUNT_LIMIT: RateLimitOptions = {
  limit: 3,
  windowMs: 60 * 60 * 1000,
};

/**
 * Payment verification calls out to the real gateway (Razorpay/Stripe) each
 * time, so this bounds both scripted hammering of the confirmation action and
 * unnecessary load on the gateway's API.
 */
export const PAYMENT_VERIFY_LIMIT: RateLimitOptions = { limit: 20, windowMs: 60 * 60 * 1000 };

/**
 * The manage-token actions (view/reschedule/cancel a booking by its link) are
 * unauthenticated and gated only by the token's own entropy, which makes
 * brute force infeasible but not scripted hammering of the endpoint itself.
 */
export const MANAGE_BOOKING_LIMIT: RateLimitOptions = { limit: 30, windowMs: 15 * 60 * 1000 };

/** Sending a teammate invitation delivers an email each time. */
export const INVITE_LIMIT: RateLimitOptions = { limit: 20, windowMs: 60 * 60 * 1000 };
