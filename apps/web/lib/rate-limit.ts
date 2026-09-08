/**
 * Fixed-window rate limiter.
 *
 * Scope: this counter lives in the process memory of one server instance. It
 * protects a single-instance deployment, which is what the shipped Dockerfile
 * produces, and it degrades to per-instance limits behind a load balancer. A
 * deployment running several instances needs a shared store such as Redis;
 * treat this as a speed bump, not as the only defence against a determined
 * attacker.
 *
 * It is still worth having: it stops a script from creating thousands of
 * bookings and customer records from one address in a few seconds.
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

const buckets = new Map<string, Window>();

/**
 * Drop windows that have already expired.
 *
 * Called opportunistically rather than on a timer, so an idle process holds no
 * background work and the map cannot grow without bound under sustained load.
 */
function evictExpired(now: number): void {
  for (const [key, window] of buckets) {
    if (window.resetAt <= now) buckets.delete(key);
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
 * control where the exact boundary behaviour does not matter.
 */
export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  // Amortise cleanup so a long-running process does not accumulate dead keys.
  if (buckets.size > 10_000) evictExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
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

/** Clear all counters. Used by tests. */
export function __resetRateLimits(): void {
  buckets.clear();
}

/**
 * Limits for the public, unauthenticated booking endpoints.
 *
 * Booking creation is deliberately tighter than availability lookups: it
 * writes rows and sends email, whereas a lookup only reads.
 */
export const PUBLIC_BOOKING_LIMIT: RateLimitOptions = { limit: 10, windowMs: 60 * 60 * 1000 };
export const PUBLIC_AVAILABILITY_LIMIT: RateLimitOptions = { limit: 120, windowMs: 60 * 1000 };
