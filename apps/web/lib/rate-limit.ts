/**
 * Fixed-window rate limiter.
 *
 * Scope: the counter lives in one server process. It protects a single-instance
 * deployment, which is what the shipped Dockerfile produces, and degrades to
 * per-instance limits behind a load balancer. A multi-instance deployment needs
 * a shared store such as Redis.
 *
 * The key is derived from a client-supplied header, so an attacker can rotate
 * it and evade the count. The map is therefore hard-capped: without a ceiling,
 * key rotation would turn this into a memory-exhaustion vector rather than a
 * defence. Treat it as a speed bump against unsophisticated abuse, not as a
 * security boundary.
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

interface Window {
  count: number;
  resetAt: number;
}

/**
 * Hard ceiling on tracked keys.
 *
 * Reached only under key rotation, which already evades the count, so evicting
 * the oldest entries costs nothing an attacker was not already getting. The
 * alternative, letting the map grow, hands them unbounded memory use.
 */
const MAX_TRACKED_KEYS = 20_000;

/**
 * Insertion order is iteration order for a Map, so the first keys yielded are
 * the least recently created. That is the eviction order used below.
 */
const buckets = new Map<string, Window>();

/** Drop expired windows; returns how many remain. */
function evictExpired(now: number): number {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
  }
  return buckets.size;
}

/**
 * Keep the map under its ceiling.
 *
 * Expired entries go first. If that is not enough, the oldest live entries are
 * dropped too, which is what bounds memory when keys are being rotated.
 */
function enforceCeiling(now: number): void {
  if (buckets.size < MAX_TRACKED_KEYS) return;

  if (evictExpired(now) < MAX_TRACKED_KEYS) return;

  const excess = buckets.size - MAX_TRACKED_KEYS + 1;
  let dropped = 0;
  for (const key of buckets.keys()) {
    buckets.delete(key);
    dropped += 1;
    if (dropped >= excess) break;
  }
}

export interface RateLimitOptions {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

/**
 * Record one request against `key` and report whether it is allowed.
 *
 * The window is fixed rather than sliding: simpler, and adequate for abuse
 * control where exact boundary behaviour does not matter.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    // Only a new key can grow the map, so the ceiling is checked here.
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

/** Number of keys currently tracked. Used by tests. */
export function __trackedKeyCount(): number {
  return buckets.size;
}

/** Clear all counters. Used by tests. */
export function __resetRateLimits(): void {
  buckets.clear();
}

/**
 * Limits for the public, unauthenticated booking endpoints.
 *
 * Booking creation is tighter than availability lookups: it writes rows and
 * sends email, whereas a lookup only reads.
 */
export const PUBLIC_BOOKING_LIMIT: RateLimitOptions = { limit: 10, windowMs: 60 * 60 * 1000 };
export const PUBLIC_AVAILABILITY_LIMIT: RateLimitOptions = { limit: 120, windowMs: 60 * 1000 };

/**
 * Limits for authentication.
 *
 * Verifying a password costs roughly 250 ms of CPU at bcrypt cost 12, and the
 * unknown-account path deliberately spends the same to avoid leaking which
 * addresses are registered. Without a cap, a handful of concurrent clients
 * could saturate the server, so the anti-enumeration design makes throttling
 * mandatory rather than optional.
 */
export const LOGIN_LIMIT: RateLimitOptions = { limit: 10, windowMs: 15 * 60 * 1000 };
export const LOGIN_PER_ACCOUNT_LIMIT: RateLimitOptions = { limit: 10, windowMs: 15 * 60 * 1000 };
export const SIGNUP_LIMIT: RateLimitOptions = { limit: 5, windowMs: 60 * 60 * 1000 };
export const PASSWORD_CHANGE_LIMIT: RateLimitOptions = { limit: 5, windowMs: 15 * 60 * 1000 };
