import { prisma } from '@bookings/database';
import { hashPassword } from '@bookings/core';

/**
 * A known tenant for the browser tests to drive.
 *
 * Deliberately self-contained rather than reusing packages/database's seed,
 * which is built for standing up a real workspace and takes its admin
 * credentials from the environment. These are throwaway fixtures for a
 * disposable database, so the credentials are fixed and in the open.
 */
export const E2E = {
  email: 'e2e-owner@example.com',
  password: 'E2ePassphrase123',
  workspaceSlug: 'e2e-clinic',
  workspaceName: 'E2E Clinic',
  serviceName: 'E2E Consultation',
  staffName: 'Dr E2E Tester',
  timezone: 'Asia/Kolkata',
} as const;

/**
 * Create the fixture tenant, replacing any previous run's copy.
 *
 * Only this workspace and its owner are removed, not the whole database, so
 * the script is safe to point at a database that holds other fixtures.
 */
export async function seedE2E(): Promise<void> {
  const existing = await prisma.workspace.findUnique({ where: { slug: E2E.workspaceSlug } });
  if (existing) {
    // Cascades to members, staff, services and bookings.
    await prisma.workspace.delete({ where: { id: existing.id } });
  }
  await prisma.user.deleteMany({ where: { email: E2E.email } });

  const user = await prisma.user.create({
    data: {
      email: E2E.email,
      name: 'E2E Owner',
      passwordHash: await hashPassword(E2E.password),
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: E2E.workspaceName,
      slug: E2E.workspaceSlug,
      timezone: E2E.timezone,
      currency: 'INR',
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
  });

  const staff = await prisma.staff.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      name: E2E.staffName,
      email: E2E.email,
      timezone: E2E.timezone,
      isActive: true,
      // Every weekday, wide open, so a slot exists whenever the suite runs.
      workingHours: {
        create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
        })),
      },
    },
  });

  await prisma.service.create({
    data: {
      workspaceId: workspace.id,
      name: E2E.serviceName,
      slug: 'e2e-consultation',
      description: 'A service that exists only for the browser tests.',
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      // Free, so the funnel confirms immediately instead of diverting to a
      // payment gateway that has no credentials in this environment.
      price: 0,
      currency: 'INR',
      locationType: 'ONLINE_MEETING',
      isActive: true,
      staffAssignments: { create: [{ staffId: staff.id }] },
    },
  });
}

if (process.argv[1]?.includes('fixtures')) {
  seedE2E()
    .then(() => {
      console.log(`Seeded ${E2E.workspaceSlug}`);
      return prisma.$disconnect();
    })
    .catch(async (err) => {
      console.error('E2E seed failed:', err);
      await prisma.$disconnect();
      process.exit(1);
    });
}
