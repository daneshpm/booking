/**
 * Delete expired session rows.
 *
 * Expired sessions are already refused at authentication time, so this is
 * housekeeping rather than a security control: without it the table grows
 * forever. Safe to run at any time and as often as you like.
 */
import { loadEnvFile } from './load-env';
import { prisma } from './client';

loadEnvFile();

async function main() {
  const now = new Date();
  const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  console.log(`Removed ${count} expired session${count === 1 ? '' : 's'}.`);
}

main()
  .catch((err) => {
    console.error('Session purge failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
