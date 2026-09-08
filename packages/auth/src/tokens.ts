import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Session token primitives.
 *
 * Kept free of any database import so they can be unit tested without a
 * generated Prisma client; session.ts wires them to the sessions table.
 */

/** Name of the cookie carrying the opaque session token. */
export const SESSION_COOKIE = 'rb_session';

/** How long a new session stays valid. */
export const SESSION_TTL_DAYS = 7;

/**
 * Generate an opaque session token.
 *
 * 32 bytes of CSPRNG output. The token is never stored; only its SHA-256 digest
 * goes to the database, so a dump of the sessions table cannot be replayed.
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** SHA-256 digest used as the database lookup key for a session token. */
export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/**
 * Constant-time comparison of two hex digests.
 *
 * Used where a candidate digest is compared against a stored one outside of a
 * primary-key lookup, so the comparison cannot leak how much of the value
 * matched through its timing.
 */
export function safeCompareDigest(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
