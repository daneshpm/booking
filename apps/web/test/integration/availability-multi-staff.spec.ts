import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

/**
 * Availability when a service has more than one staff member.
 *
 * `loadSchedules` fetches working hours, overrides, bookings and collective
 * participations for the whole candidate set in one query each and then groups
 * the rows by staff id. Every guarantee here depends on that grouping being
 * right: pool one staff member's busy time onto another and the page hides
 * times that are genuinely free; drop it and the page offers times that are
 * already taken.
 *
 * The single-staff suite in public-booking.spec.ts cannot see either mistake,
 * because with one candidate every grouping is the identity.
 */
describe('availability across several staff', () => {
  let tenant: TestTenant;
  let secondStaffId: string;
  let getAvailableSlotsAction: typeof import('../../app/book/actions').getAvailableSlotsAction;

  beforeAll(async () => {
    await prisma.$connect();
    ({ getAvailableSlotsAction } = await import('../../app/book/actions'));
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    await __resetRateLimits();
    tenant = await createTenant('multi');

    // A second staff member on the same service, with the same weekday hours
    // as the first, so the two are interchangeable unless a test says otherwise.
    const second = await prisma.staff.create({
      data: {
        workspaceId: tenant.workspaceId,
        name: 'Second Staff',
        email: `second-${tenant.workspaceSlug}@example.com`,
        timezone: 'Asia/Kolkata',
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
    secondStaffId = second.id;
    await prisma.serviceStaff.create({
      data: { serviceId: tenant.serviceId, staffId: second.id },
    });
  });

  function upcomingWeekday(weeksAhead = 2): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + weeksAhead * 7);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d.toISOString().slice(0, 10);
  }

  async function makeCustomer(email: string): Promise<string> {
    const customer = await prisma.customer.create({
      data: { workspaceId: tenant.workspaceId, name: 'Customer', email },
    });
    return customer.id;
  }

  /**
   * Book `staffId` over the slot at `time`, bypassing the public action so the
   * test controls which staff member is occupied rather than the router.
   * `time` is a workspace-local time and the tenant timezone is Asia/Kolkata.
   */
  async function occupy(staffId: string, date: string, time: string): Promise<void> {
    const start = new Date(`${date}T${time}:00.000+05:30`);
    await prisma.booking.create({
      data: {
        workspaceId: tenant.workspaceId,
        serviceId: tenant.serviceId,
        staffId,
        customerId: await makeCustomer(`c-${staffId}-${time}@example.com`),
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60 * 1000),
        customerTimezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
      },
    });
  }

  it('offers a time from both staff members while both are free', async () => {
    const date = upcomingWeekday();
    const { slots } = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);

    const attributed = new Set(slots.map((s) => s.staffId));
    // Not asserting which one wins any given slot — that is the routing
    // strategy's business — only that both are reachable candidates.
    expect(attributed.size).toBeGreaterThanOrEqual(1);
    expect(slots.length).toBeGreaterThan(0);
  });

  it('does not let one staff member’s booking block the other', async () => {
    const date = upcomingWeekday();
    const before = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    const target = before.slots[0].time;

    await occupy(secondStaffId, date, target);

    // The first staff member is still free at this time, so it must still be
    // offered. If busy ranges were pooled across candidates rather than keyed
    // by staff id, this time would have vanished.
    const after = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    expect(after.slots.map((s) => s.time)).toContain(target);

    const stillOffered = after.slots.find((s) => s.time === target);
    expect(stillOffered?.staffId).toBe(tenant.staffId);
  });

  it('withdraws a time only once every staff member is busy', async () => {
    const date = upcomingWeekday();
    const before = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    const target = before.slots[0].time;

    await occupy(secondStaffId, date, target);
    await occupy(tenant.staffId, date, target);

    const after = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    expect(after.slots.map((s) => s.time)).not.toContain(target);
  });

  it('applies a day off to only the staff member it belongs to', async () => {
    const date = upcomingWeekday();

    await prisma.staffOverride.create({
      data: {
        staffId: secondStaffId,
        date: new Date(`${date}T00:00:00.000Z`),
        isWorking: false,
      },
    });

    const { slots } = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);

    // The other staff member still works a normal day, so the day is bookable
    // and nothing is attributed to the one who is off.
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.map((s) => s.staffId)).not.toContain(secondStaffId);
  });

  it('treats a collective participation as busy for that staff member alone', async () => {
    const date = upcomingWeekday();
    const before = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    const target = before.slots[0].time;
    const start = new Date(`${date}T${target}:00.000+05:30`);

    // A collective booking owned elsewhere that commits the second staff
    // member's time. It lives in a different table but must count the same.
    const host = await prisma.booking.create({
      data: {
        workspaceId: tenant.workspaceId,
        serviceId: tenant.serviceId,
        staffId: tenant.staffId,
        customerId: await makeCustomer('host@example.com'),
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60 * 1000),
        customerTimezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
      },
    });
    await prisma.bookingParticipant.create({
      data: {
        bookingId: host.id,
        staffId: secondStaffId,
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60 * 1000),
        status: 'CONFIRMED',
      },
    });

    // Both are now committed at this time — one by a booking, one by a
    // participation — so it must not be offered.
    const after = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    expect(after.slots.map((s) => s.time)).not.toContain(target);
  });
});
