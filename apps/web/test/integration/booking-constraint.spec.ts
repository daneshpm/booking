import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { isOverlapConstraintViolation } from '../../lib/booking-errors';
import { resetDatabase, createTenant, nextWeekdayAt, type TestTenant } from './helpers';

/**
 * The double-booking guarantee.
 *
 * These assertions target the database rather than the application, because a
 * check-then-insert in application code cannot stop two concurrent requests
 * from both passing the check. Only a constraint can.
 */
describe('booking overlap exclusion constraint', () => {
  let tenant: TestTenant;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    tenant = await createTenant('overlap');
  });

  async function makeCustomer(email: string) {
    return prisma.customer.create({
      data: { workspaceId: tenant.workspaceId, name: 'Customer', email },
    });
  }

  function bookingData(
    customerId: string,
    start: Date,
    end: Date,
    status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED'
  ) {
    return {
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      staffId: tenant.staffId,
      customerId,
      startTime: start,
      endTime: end,
      status,
    };
  }

  it('accepts a first booking', async () => {
    const customer = await makeCustomer('a@example.test');
    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() + 30 * 60_000);

    const booking = await prisma.booking.create({ data: bookingData(customer.id, start, end) });
    expect(booking.id).toBeTruthy();
  });

  it('rejects an exactly overlapping booking for the same staff member', async () => {
    const first = await makeCustomer('a@example.test');
    const second = await makeCustomer('b@example.test');
    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() + 30 * 60_000);

    await prisma.booking.create({ data: bookingData(first.id, start, end) });

    await expect(
      prisma.booking.create({ data: bookingData(second.id, start, end) })
    ).rejects.toSatisfy(isOverlapConstraintViolation);
  });

  it('rejects a partially overlapping booking', async () => {
    const first = await makeCustomer('a@example.test');
    const second = await makeCustomer('b@example.test');
    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() + 30 * 60_000);

    await prisma.booking.create({ data: bookingData(first.id, start, end) });

    // Starts 15 minutes into the existing appointment.
    const overlapStart = new Date(start.getTime() + 15 * 60_000);
    const overlapEnd = new Date(overlapStart.getTime() + 30 * 60_000);

    await expect(
      prisma.booking.create({ data: bookingData(second.id, overlapStart, overlapEnd) })
    ).rejects.toSatisfy(isOverlapConstraintViolation);
  });

  it('allows a booking that starts exactly when the previous one ends', async () => {
    const first = await makeCustomer('a@example.test');
    const second = await makeCustomer('b@example.test');
    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() + 30 * 60_000);

    await prisma.booking.create({ data: bookingData(first.id, start, end) });

    // The range is half-open, so touching endpoints do not overlap.
    const adjacent = await prisma.booking.create({
      data: bookingData(second.id, end, new Date(end.getTime() + 30 * 60_000)),
    });
    expect(adjacent.id).toBeTruthy();
  });

  it('allows the slot to be reused once the original booking is cancelled', async () => {
    const first = await makeCustomer('a@example.test');
    const second = await makeCustomer('b@example.test');
    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() + 30 * 60_000);

    const original = await prisma.booking.create({ data: bookingData(first.id, start, end) });
    await prisma.booking.update({ where: { id: original.id }, data: { status: 'CANCELLED' } });

    const replacement = await prisma.booking.create({ data: bookingData(second.id, start, end) });
    expect(replacement.id).toBeTruthy();
  });

  it('allows the same time slot for a different staff member', async () => {
    const customer = await makeCustomer('a@example.test');
    const otherStaff = await prisma.staff.create({
      data: {
        workspaceId: tenant.workspaceId,
        name: 'Second Staff',
        email: 'second@example.test',
        timezone: 'Asia/Kolkata',
      },
    });

    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() + 30 * 60_000);

    await prisma.booking.create({ data: bookingData(customer.id, start, end) });

    const parallel = await prisma.booking.create({
      data: { ...bookingData(customer.id, start, end), staffId: otherStaff.id },
    });
    expect(parallel.id).toBeTruthy();
  });

  it('rejects an appointment that ends before it starts', async () => {
    const customer = await makeCustomer('a@example.test');
    const start = nextWeekdayAt(10);
    const end = new Date(start.getTime() - 30 * 60_000);

    await expect(
      prisma.booking.create({ data: bookingData(customer.id, start, end) })
    ).rejects.toThrow();
  });

  it('holds under concurrent inserts for the same slot', async () => {
    // The real scenario the constraint exists for: several requests racing,
    // all having passed an application-level availability check.
    const customers = await Promise.all(
      ['c1', 'c2', 'c3', 'c4', 'c5'].map((name) => makeCustomer(`${name}@example.test`))
    );

    const start = nextWeekdayAt(11);
    const end = new Date(start.getTime() + 30 * 60_000);

    const results = await Promise.allSettled(
      customers.map((customer) =>
        prisma.booking.create({ data: bookingData(customer.id, start, end) })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled');
    const failed = results.filter((r) => r.status === 'rejected');

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(4);
    for (const failure of failed) {
      expect(isOverlapConstraintViolation((failure as PromiseRejectedResult).reason)).toBe(true);
    }

    const stored = await prisma.booking.count({ where: { staffId: tenant.staffId } });
    expect(stored).toBe(1);
  });
});
