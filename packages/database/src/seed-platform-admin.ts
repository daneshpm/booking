/**
 * Grant one account platform-admin access — the cross-tenant, read-only
 * organizations list at /super-admin.
 *
 * Deliberately not folded into seed.ts: that script provisions a workspace
 * and its owner together, and a platform admin is neither — it belongs to no
 * workspace at all, and mixing the two would make it too easy to accidentally
 * grant platform access while doing ordinary workspace setup.
 *
 * Credentials come from the environment, same convention as ADMIN_EMAIL /
 * ADMIN_PASSWORD in seed.ts, but named separately so the two can never be
 * confused for one another:
 *   PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_PASSWORD, PLATFORM_ADMIN_NAME (optional)
 *
 * Running it twice is safe, and safe in the specific sense that matters here:
 * if the email already belongs to a real account (most likely a workspace
 * owner logging into their own workspace day to day), this only sets the
 * isPlatformAdmin flag — it never touches that account's existing password.
 * PLATFORM_ADMIN_PASSWORD is used only when creating a brand new account.
 */
import { loadEnvFile } from './load-env';
import { prisma } from './client';
import { hashPassword, validatePasswordPolicy } from '@bookings/core';

loadEnvFile();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `${name} is required. Set it in your environment before running this, ` +
        'for example: PLATFORM_ADMIN_EMAIL=you@example.com PLATFORM_ADMIN_PASSWORD=... ' +
        'npm run db:seed-platform-admin'
    );
  }
  return value.trim();
}

async function main() {
  const email = requireEnv('PLATFORM_ADMIN_EMAIL').toLowerCase();
  const name = process.env.PLATFORM_ADMIN_NAME?.trim() || 'Platform Admin';

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (existing.isPlatformAdmin) {
      console.log(`${email} is already a platform admin. Nothing to do.`);
      return;
    }
    await prisma.user.update({ where: { id: existing.id }, data: { isPlatformAdmin: true } });
    console.log(`Granted platform-admin access to the existing account ${email}.`);
    console.log('Its password was not changed.');
    return;
  }

  const password = requireEnv('PLATFORM_ADMIN_PASSWORD');
  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    throw new Error(
      `PLATFORM_ADMIN_PASSWORD is not strong enough:\n  - ${policy.errors.join('\n  - ')}`
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.user.create({
    data: { email, name, passwordHash, isPlatformAdmin: true },
  });
  console.log(`Created a new platform-admin account for ${email}.`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
