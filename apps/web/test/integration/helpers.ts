import { prisma } from '@bookings/database';
import { hashPassword } from '@bookings/core';
import { createSession } from '@bookings/auth';

/**
 * Delete every row, in dependency order.
 *
 * TRUNCATE ... CASCADE is used rather than deleteMany per table so the order
 * cannot silently break as the schema grows.
 */
export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "notification_logs",
      "booking_audit_logs",
      "bookings",
      "waitlist_entries",
      "workflows",
      "service_staff",
      "staff_breaks",
      "staff_working_hours",
      "staff_overrides",
      "staff",
      "services",
      "service_categories",
      "customers",
      "booking_pages",
      "calendar_connections",
      "workspace_members",
      "sessions",
      "workspaces",
      "users"
    RESTART IDENTITY CASCADE;
  `);
}

export interface TestTenant {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceSlug: string;
  staffId: string;
  serviceId: string;
  sessionToken: string;
}

let counter = 0;

/**
 * Create a fully formed tenant: a user, their workspace, an owner membership,
 * one staff member with weekday hours, one service, and a live session.
 */
export async function createTenant(
  label: string,
  options: { role?: 'OWNER' | 'ADMIN' | 'STAFF' | 'RECEPTIONIST'; timezone?: string } = {}
): Promise<TestTenant> {
  counter += 1;
  const suffix = `${label}-${counter}`;
  const email = `${suffix}@example.com`;
  const timezone = options.timezone ?? 'Asia/Kolkata';

  const user = await prisma.user.create({
    data: {
      email,
      name: `User ${suffix}`,
      passwordHash: await hashPassword('Str0ngPassphrase'),
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `Workspace ${suffix}`,
      slug: `ws-${suffix}`,
      timezone,
      currency: 'INR',
      members: { create: { userId: user.id, role: options.role ?? 'OWNER' } },
    },
  });

  const staff = await prisma.staff.create({
    data: {
      workspaceId: workspace.id,
      userId: user.id,
      name: `Staff ${suffix}`,
      email,
      timezone,
      isActive: true,
      workingHours: {
        create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
          dayOfWeek,
          startTime: '09:00',
          endTime: '18:00',
        })),
      },
    },
  });

  const service = await prisma.service.create({
    data: {
      workspaceId: workspace.id,
      name: `Service ${suffix}`,
      slug: `svc-${suffix}`,
      durationMinutes: 30,
      bufferBeforeMinutes: 0,
      bufferAfterMinutes: 0,
      price: 0,
      currency: 'INR',
      locationType: 'ONLINE_MEETING',
      isActive: true,
      staffAssignments: { create: [{ staffId: staff.id }] },
    },
  });

  const { token } = await createSession({ userId: user.id });

  return {
    userId: user.id,
    email,
    workspaceId: workspace.id,
    workspaceSlug: workspace.slug,
    staffId: staff.id,
    serviceId: service.id,
    sessionToken: token,
  };
}

/** A UTC instant on the next weekday, at the given hour. */
export function nextWeekdayAt(hourUtc: number, daysAhead = 7): Date {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysAhead);
  // Shift off Saturday and Sunday so it lands inside the seeded working hours.
  while (date.getUTCDay() === 0 || date.getUTCDay() === 6) {
    date.setUTCDate(date.getUTCDate() + 1);
  }
  date.setUTCHours(hourUtc, 0, 0, 0);
  return date;
}
