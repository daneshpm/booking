import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { createBookingWithCapacityAndParticipants } from '../../lib/booking-capacity';
import {
  BookingCapacityExceededError,
  isOverlapConstraintViolation,
} from '../../lib/booking-errors';
import { resetDatabase, createTenant, nextWeekdayAt, type TestTenant } from './helpers';

/**
 * Group-service capacity.
 *
 * Group bookings are deliberately exempt from bookings_no_staff_overlap —
 * several customers sharing one slot is the entire point of the feature — so
 * the constraint that guarantees every other booking cannot protect these.
 * The only thing standing between a capacity-3 class and a capacity-30 class
 * is the advisory-lock count-then-insert in lib/booking-capacity.ts, which
 * makes these tests the sole verification that a group session cannot be
 * oversold.
 */
describe('group booking capacity', () => {
  let tenant: TestTenant;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    tenant = await createTenant('capacity');
  });

  async function makeCustomer(email: string): Promise<string> {
    const customer = await prisma.customer.create({
      data: { workspaceId: tenant.workspaceId, name: 'Customer', email },
    });
    return customer.id;
  }

  /** Turn the tenant's service into a group service with the given capacity. */
  async function setCapacity(capacity: number): Promise<void> {
    await prisma.service.update({
      where: { id: tenant.serviceId },
      data: { capacity },
    });
  }

  /** Book one seat through the same helper the real booking flow uses. */
  function claimSeat(customerId: string, start: Date, end: Date, capacity: number) {
    return createBookingWithCapacityAndParticipants(
      {
        workspaceId: tenant.workspaceId,
        serviceId: tenant.serviceId,
        staffId: tenant.staffId,
        customerId,
        startTime: start,
        endTime: end,
        customerTimezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
        isGroupBooking: true,
      },
      {
        isGroupService: true,
        serviceId: tenant.serviceId,
        staffId: tenant.staffId,
        startUtc: start,
        endUtc: end,
        capacity,
        participants: [],
      }
    );
  }

  it('allows several customers to share one slot up to capacity', async () => {
    await setCapacity(3);
    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() + 30 * 60_000);

    for (const name of ['a', 'b', 'c']) {
      const customerId = await makeCustomer(`${name}@example.com`);
      await claimSeat(customerId, start, end, 3);
    }

    const stored = await prisma.booking.count({ where: { staffId: tenant.staffId } });
    expect(stored).toBe(3);
  });

  it('refuses the seat past capacity', async () => {
    await setCapacity(2);
    const start = nextWeekdayAt(11);
    const end = new Date(start.getTime() + 30 * 60_000);

    await claimSeat(await makeCustomer('a@example.com'), start, end, 2);
    await claimSeat(await makeCustomer('b@example.com'), start, end, 2);

    await expect(
      claimSeat(await makeCustomer('c@example.com'), start, end, 2)
    ).rejects.toBeInstanceOf(BookingCapacityExceededError);

    expect(await prisma.booking.count({ where: { staffId: tenant.staffId } })).toBe(2);
  });

  it('holds capacity under concurrent claims for the same slot', async () => {
    // The scenario the advisory lock exists for: eight requests racing, each
    // having passed the availability check the booking page ran. Without the
    // lock every one of them counts two seats used and inserts a third.
    await setCapacity(3);
    const start = nextWeekdayAt(12);
    const end = new Date(start.getTime() + 30 * 60_000);

    const customerIds = await Promise.all(
      ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].map((n) => makeCustomer(`${n}@example.com`))
    );

    const results = await Promise.allSettled(
      customerIds.map((customerId) => claimSeat(customerId, start, end, 3))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    expect(succeeded).toHaveLength(3);

    for (const failure of results.filter((r) => r.status === 'rejected')) {
      expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(
        BookingCapacityExceededError
      );
    }

    // The database is the real assertion: exactly capacity rows, no more.
    expect(await prisma.booking.count({ where: { staffId: tenant.staffId } })).toBe(3);
  });

  it('counts a seat by time overlap, not by an identical start time', async () => {
    // Add-ons make effective duration vary per booking, so two bookings of the
    // same group service can overlap while starting at different minutes. A
    // capacity check keyed on an exact start would count these separately and
    // let the slot be oversold.
    await setCapacity(1);
    const start = nextWeekdayAt(13);
    const end = new Date(start.getTime() + 60 * 60_000);

    await claimSeat(await makeCustomer('first@example.com'), start, end, 1);

    const overlappingStart = new Date(start.getTime() + 30 * 60_000);
    const overlappingEnd = new Date(overlappingStart.getTime() + 60 * 60_000);

    await expect(
      claimSeat(await makeCustomer('second@example.com'), overlappingStart, overlappingEnd, 1)
    ).rejects.toBeInstanceOf(BookingCapacityExceededError);

    expect(await prisma.booking.count({ where: { staffId: tenant.staffId } })).toBe(1);
  });

  it('leaves a genuinely non-overlapping slot free', async () => {
    await setCapacity(1);
    const start = nextWeekdayAt(14);
    const end = new Date(start.getTime() + 30 * 60_000);

    await claimSeat(await makeCustomer('first@example.com'), start, end, 1);

    // Starts exactly when the first ends: adjacent, not overlapping.
    await claimSeat(
      await makeCustomer('second@example.com'),
      end,
      new Date(end.getTime() + 30 * 60_000),
      1
    );

    expect(await prisma.booking.count({ where: { staffId: tenant.staffId } })).toBe(2);
  });

  it('still blocks a different service on the same staff member at that time', async () => {
    // Exempting group rows from bookings_no_staff_overlap opened a gap: a
    // group class and an unrelated one-on-one could both hold the same staff
    // member. bookings_no_cross_service_staff_overlap closes it, and nothing
    // else verifies that constraint exists.
    await setCapacity(5);
    const start = nextWeekdayAt(15);
    const end = new Date(start.getTime() + 30 * 60_000);

    await claimSeat(await makeCustomer('class@example.com'), start, end, 5);

    const otherService = await prisma.service.create({
      data: {
        workspaceId: tenant.workspaceId,
        name: 'One-on-one consult',
        slug: `svc-other-${Date.now()}`,
        durationMinutes: 30,
        price: 0,
        currency: 'INR',
        locationType: 'ONLINE_MEETING',
        isActive: true,
      },
    });

    const conflicting = prisma.booking.create({
      data: {
        workspaceId: tenant.workspaceId,
        serviceId: otherService.id,
        staffId: tenant.staffId,
        customerId: await makeCustomer('private@example.com'),
        startTime: start,
        endTime: end,
        customerTimezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
      },
    });

    await expect(conflicting).rejects.toThrow();
    await expect(conflicting.catch((e) => isOverlapConstraintViolation(e))).resolves.toBe(true);
  });
});

/**
 * The three exclusion constraints are the backbone of the scheduling
 * guarantee, and two of them were previously verified by nothing at all. A
 * migration that silently failed to apply would otherwise surface as
 * double-booked staff in production rather than as a failing test.
 */
describe('scheduling exclusion constraints exist', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const expected = [
    'bookings_no_staff_overlap',
    'bookings_no_cross_service_staff_overlap',
    'booking_participants_no_staff_overlap',
  ];

  for (const name of expected) {
    it(`has ${name} as an exclusion constraint`, async () => {
      const rows = await prisma.$queryRawUnsafe<Array<{ contype: string }>>(
        `SELECT contype::text FROM pg_constraint WHERE conname = '${name}'`
      );

      expect(rows).toHaveLength(1);
      // 'x' is the exclusion-constraint type; a plain index would not give the
      // same guarantee under concurrency.
      expect(rows[0].contype).toBe('x');
    });
  }
});
