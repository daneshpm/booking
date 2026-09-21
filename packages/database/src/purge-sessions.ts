/**
 * Delete expired session rows.
 *
 * Expired sessions are already refused at authentication time, so this is
 * housekeeping rather than a security control: without it the table grows
 * forever. Safe to run at any time and as often as you like.
 */
import { loadEnvFile } from './load-env';
import { prisma } from './client';
import { logger } from '@bookings/core';

loadEnvFile();

async function main() {
  const now = new Date();

  // Counts as fields rather than in the sentence: this runs unattended, so the
  // output is read by whatever collects logs, not by a person at a terminal.
  const sessions = await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  logger.info('Expired sessions purged', { removed: sessions.count });

  // Used and expired reset tokens are dead weight; a used one can never be
  // replayed, so keeping it serves no purpose.
  const tokens = await prisma.passwordResetToken.deleteMany({
    where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] },
  });
  logger.info('Spent password reset tokens purged', { removed: tokens.count });
}

main()
  .catch((err) => {
    logger.error('Session purge failed', { err: err instanceof Error ? err.message : err });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
