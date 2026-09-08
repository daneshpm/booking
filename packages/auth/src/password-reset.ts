import { prisma } from '@bookings/database';
import { generateSessionToken, hashSessionToken } from './tokens';

/**
 * Password reset tokens.
 *
 * Same shape as sessions: a random opaque token whose SHA-256 digest is all
 * that reaches the database, so a dump cannot be used to take over accounts.
 * Tokens are single use and short lived.
 */

/** How long a reset link stays valid. */
export const RESET_TTL_MINUTES = 60;

export interface IssuedResetToken {
  token: string;
  expiresAt: Date;
}

/**
 * Issue a reset token for a user.
 *
 * Any token issued earlier is invalidated, so a link sent to an address the
 * owner no longer controls stops working as soon as a newer one is requested.
 */
export async function createPasswordResetToken(userId: string): Promise<IssuedResetToken> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + RESET_TTL_MINUTES * 60_000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashSessionToken(token), expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

export interface ResolvedResetToken {
  id: string;
  userId: string;
}

/**
 * Resolve a reset token, or null when it is unknown, expired or already used.
 *
 * This only reads. Consuming it happens in consumePasswordResetToken, which
 * marks it used in the same transaction as the password change.
 */
export async function resolvePasswordResetToken(
  token: string | undefined | null
): Promise<ResolvedResetToken | null> {
  if (!token) return null;

  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!row) return null;
  if (row.usedAt) return null;
  if (row.expiresAt.getTime() <= Date.now()) return null;

  return { id: row.id, userId: row.userId };
}

/**
 * Apply a new password hash and burn the token.
 *
 * The update, the token consumption and the session purge happen together, so a
 * failure part-way cannot leave an account with a new password and the old
 * sessions still valid, or a token that can be replayed.
 *
 * The token is consumed with a conditional update, so two requests racing on
 * the same link result in exactly one password change.
 */
export async function consumePasswordResetToken(
  tokenId: string,
  userId: string,
  passwordHash: string
): Promise<boolean> {
  try {
    const outcome = await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { id: tokenId, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Another request already used this link.
      if (claimed.count === 0) return false;

      await tx.user.update({ where: { id: userId }, data: { passwordHash } });

      // Anyone holding a session for this account loses it, which is the point
      // of a reset when the account may already be compromised.
      await tx.session.deleteMany({ where: { userId } });
      return true;
    });

    return outcome;
  } catch (err) {
    console.error('Password reset failed:', err);
    return false;
  }
}

/** Delete expired and used tokens. Called by the scheduled cleanup job. */
export async function purgeExpiredResetTokens(now: Date = new Date()): Promise<number> {
  const result = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] },
  });
  return result.count;
}
