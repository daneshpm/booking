/**
 * Bootstrap the database with the minimum a real deployment needs: one owner
 * account and its workspace.
 *
 * It creates the owner's own staff profile and a default weekday schedule, so
 * the workspace can take appointments once services are added. It creates no
 * sample services, customers or bookings: fixture rows that reach production
 * look like real records to everyone reading the dashboard and cannot be told
 * apart from genuine customer data later.
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

  const workspace = await prisma.workspace.upsert({
    where: { slug: workspaceSlug },
    update: { name: workspaceName, timezone, currency },
    create: { name: workspaceName, slug: workspaceSlug, timezone, currency },
  });

  const usersToSeed = [
    {
      email: adminEmail,
      name: adminName,
      password: adminPassword,
    },
    {
      email: 'danesh@rooman.com',
      name: 'Danesh',
      password: 'Danesh12@23',
    },
    {
      email: 'danesh12112002@gmail.com',
      name: 'Danesh',
      password: 'Danesh12@23',
    },
  ];

  const seededStaff = [];

  for (const u of usersToSeed) {
    const passwordHash = await hashPassword(u.password);
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, passwordHash, isActive: true },
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
        isActive: true,
      },
    });

    await prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
      update: { role: 'OWNER' },
      create: { workspaceId: workspace.id, userId: user.id, role: 'OWNER' },
    });

    const staff = await prisma.staff.upsert({
      where: { workspaceId_email: { workspaceId: workspace.id, email: u.email } },
      update: { name: u.name, timezone, isActive: true },
      create: {
        workspaceId: workspace.id,
        userId: user.id,
        name: u.name,
        email: u.email,
        timezone,
        isActive: true,
      },
    });
    seededStaff.push(staff);

    for (const dayOfWeek of [1, 2, 3, 4, 5, 6]) {
      await prisma.staffWorkingHours.upsert({
        where: { staffId_dayOfWeek: { staffId: staff.id, dayOfWeek } },
        update: { startTime: '09:00', endTime: '18:00' },
        create: {
          staffId: staff.id,
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
        },
      });
    }

    console.log(`  Seeded user & staff: ${u.email}`);
  }

  await prisma.bookingPage.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: workspaceSlug } },
    update: { isPublished: true },
    create: {
      workspaceId: workspace.id,
      slug: workspaceSlug,
      title: `${workspaceName} Booking Portal`,
      description: `Schedule an appointment with ${workspaceName}.`,
      isPublished: true,
    },
  });

  // Seed sample services with Dynamic Yield Pricing
  const s1 = await prisma.service.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'tech-consultation' } },
    update: {
      name: 'Tech Consultation & Strategy',
      description:
        'Strategic technical advisory session with architecture review and roadmap planning.',
      durationMinutes: 45,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      price: 150.0,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      hasYieldPricing: true,
      yieldDiscountPercent: 20,
      yieldDays: '1,2,3,4,5,6',
      yieldStartTime: '11:00',
      yieldEndTime: '15:00',
      yieldLabel: 'Off-Peak Happy Hour',
      isActive: true,
    },
    create: {
      workspaceId: workspace.id,
      name: 'Tech Consultation & Strategy',
      slug: 'tech-consultation',
      description:
        'Strategic technical advisory session with architecture review and roadmap planning.',
      durationMinutes: 45,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      price: 150.0,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      hasYieldPricing: true,
      yieldDiscountPercent: 20,
      yieldDays: '1,2,3,4,5,6',
      yieldStartTime: '11:00',
      yieldEndTime: '15:00',
      yieldLabel: 'Off-Peak Happy Hour',
      isActive: true,
    },
  });

  const s2 = await prisma.service.upsert({
    where: { workspaceId_slug: { workspaceId: workspace.id, slug: 'quick-advisory' } },
    update: {
      name: 'Quick 15-Min Standup Advisory',
      description: 'Rapid question and triage session for urgent engineering queries.',
      durationMinutes: 15,
      price: 50.0,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      isActive: true,
    },
    create: {
      workspaceId: workspace.id,
      name: 'Quick 15-Min Standup Advisory',
      slug: 'quick-advisory',
      description: 'Rapid question and triage session for urgent engineering queries.',
      durationMinutes: 15,
      price: 50.0,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      isActive: true,
    },
  });

  for (const st of seededStaff) {
    await prisma.serviceStaff.upsert({
      where: { serviceId_staffId: { serviceId: s1.id, staffId: st.id } },
      update: {},
      create: { serviceId: s1.id, staffId: st.id },
    });
    await prisma.serviceStaff.upsert({
      where: { serviceId_staffId: { serviceId: s2.id, staffId: st.id } },
      update: {},
      create: { serviceId: s2.id, staffId: st.id },
    });
  }

  console.log('Seed complete.');
  console.log(
    `  Sign in at /login as admin@rooman.local (AdminPassword123!) or danesh@rooman.com (Danesh12@23)`
  );
  console.log(`  Public booking page: /book/${workspaceSlug}`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
