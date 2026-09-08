/**
 * Bootstrap the database with the minimum a real deployment needs: one owner
 * account and its workspace.
 *
 * There is deliberately no sample staff, service or booking data. Fixture rows
 * that reach production look like real records to everyone who reads the
 * dashboard, and cannot be told apart from genuine customer data later.
 *
 * Credentials come from the environment and the script refuses to invent them:
 *   ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, WORKSPACE_NAME,
 *   WORKSPACE_SLUG, WORKSPACE_TIMEZONE, WORKSPACE_CURRENCY
 *
 * Running it twice is safe: an existing owner keeps their current password.
 */
import { loadEnvFile } from './load-env';
import { prisma } from './client';
import { hashPassword, validatePasswordPolicy } from '@bookings/core';

// Pick up a repository-root .env when one exists. In CI and containers the
// values come from the real environment instead.
loadEnvFile();

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `${name} is required. Set it in your environment before running the seed, ` +
        'for example: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... npm run db:seed'
    );
  }
  return value.trim();
}

async function main() {
  const adminEmail = requireEnv('ADMIN_EMAIL').toLowerCase();
  const adminPassword = requireEnv('ADMIN_PASSWORD');
  const adminName = process.env.ADMIN_NAME?.trim() || 'Workspace Owner';

  const workspaceName = process.env.WORKSPACE_NAME?.trim() || 'Rooman Technologies';
  const workspaceSlug = slugify(process.env.WORKSPACE_SLUG?.trim() || workspaceName);
  const timezone = process.env.WORKSPACE_TIMEZONE?.trim() || 'Asia/Kolkata';
  const currency = (process.env.WORKSPACE_CURRENCY?.trim() || 'INR').toUpperCase();

  const policy = validatePasswordPolicy(adminPassword);
  if (!policy.valid) {
    throw new Error(`ADMIN_PASSWORD is not strong enough:\n  - ${policy.errors.join('\n  - ')}`);
  }

  console.log(`Seeding workspace "${workspaceName}" (${workspaceSlug})...`);

  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });

  // An existing account keeps its password. Overwriting it here would let
  // anyone who can run the seed reset a live administrator's credentials.
  const user = existingUser
    ? await prisma.user.update({
        where: { id: existingUser.id },
        data: { name: adminName, isActive: true },
      })
    : await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          passwordHash: await hashPassword(adminPassword),
        },
      });

  if (existingUser) {
    console.log(`  User ${adminEmail} already exists; password left unchanged.`);
  }

  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: { name: workspaceName, timezone, currency },
    create: { name: workspaceName, slug: workspaceSlug, timezone, currency },
  });

  await prisma.workspaceMember.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: { role: 'OWNER' },
    create: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
  });

  // The owner is also a bookable staff member so the workspace can take
  // appointments as soon as services are added.
  const staff = await prisma.staff.upsert({
    where: { workspaceId_email: { workspaceId: workspace.id, email: adminEmail } },
    update: { name: adminName, timezone, isActive: true },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      name: adminName,
      email: adminEmail,
      timezone,
      isActive: true,
    },
  });

  const hasHours = await prisma.staffWorkingHours.count({ where: { staffId: staff.id } });
  if (hasHours === 0) {
    await prisma.staffWorkingHours.createMany({
      data: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
        staffId: staff.id,
        dayOfWeek,
        startTime: '09:00',
        endTime: '18:00',
      })),
    });
    console.log('  Added default Monday to Friday working hours.');
  }

  await prisma.bookingPage.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: workspaceSlug } },
    update: {},
    create: {
      workspaceId: workspace.id,
      slug: workspaceSlug,
      title: `${workspaceName} Booking Portal`,
      description: `Schedule an appointment with ${workspaceName}.`,
      isPublished: true,
    },
  });

  console.log('Seed complete.');
  console.log(`  Sign in at /login as ${adminEmail}`);
  console.log(`  Public booking page: /book/${workspaceSlug}`);
  console.log('  Add your services and staff from the dashboard.');
}

main()
  .catch((err) => {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
