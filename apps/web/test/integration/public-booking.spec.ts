import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

/**
 * The public booking endpoint against a real database.
 *
 * These cover the cases where the slot list and the booking write could
 * disagree. When they do, a customer is either offered a time that cannot be
 * booked, or worse, a time outside working hours is accepted.
 */
describe('public booking', () => {
  let tenant: TestTenant;
  let getAvailableSlotsAction: typeof import('../../app/book/actions').getAvailableSlotsAction;
  let createPublicBookingAction: typeof import('../../app/book/actions').createPublicBookingAction;

  beforeAll(async () => {
    await prisma.$connect();
    const actions = await import('../../app/book/actions');
    getAvailableSlotsAction = actions.getAvailableSlotsAction;
    createPublicBookingAction = actions.createPublicBookingAction;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    // The limiter is process-wide and the suite makes more booking attempts
    // than one caller is allowed in an hour, so each test starts fresh.
    await __resetRateLimits();
    tenant = await createTenant('booking');
  });

  /** A weekday far enough ahead to clear the lead time, as YYYY-MM-DD. */
  function upcomingWeekday(weeksAhead = 2): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + weeksAhead * 7);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d.toISOString().slice(0, 10);
  }

  const customer = {
    customerName: 'Ravi Shankar',
    customerEmail: 'ravi@example.com',
  };

  it('offers slots inside the configured working hours', async () => {
    const result = await getAvailableSlotsAction(
      tenant.workspaceId,
      tenant.serviceId,
      upcomingWeekday()
    );

    expect(result.success).toBe(true);
    expect(result.slots.length).toBeGreaterThan(0);
    // The fixture works 09:00 to 18:00, so nothing before or after may appear.
    for (const slot of result.slots) {
      expect(slot.time >= '09:00').toBe(true);
      expect(slot.time < '18:00').toBe(true);
    }
  });

  it('books a slot that the listing offered', async () => {
    const date = upcomingWeekday();
    const { slots } = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);

    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date,
      time: slots[0].time,
      ...customer,
    });

    expect(result.success).toBe(true);
    expect(result.bookingId).toBeTruthy();
  });

  it('refuses a time outside working hours even though the format is valid', async () => {
    // The endpoint is unauthenticated, so a hand-built request is not bound by
    // whatever the booking page displayed.
    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date: upcomingWeekday(),
      time: '03:00',
      ...customer,
    });

    expect(result.success).toBe(false);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('refuses a booking on a day the staff member does not work', async () => {
    // The fixture works Monday to Friday only.
    const sunday = new Date();
    sunday.setUTCDate(sunday.getUTCDate() + 14);
    while (sunday.getUTCDay() !== 0) sunday.setUTCDate(sunday.getUTCDate() + 1);

    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date: sunday.toISOString().slice(0, 10),
      time: '10:00',
      ...customer,
    });

    expect(result.success).toBe(false);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('refuses a time that is not on the slot grid', async () => {
    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date: upcomingWeekday(),
      time: '10:07',
      ...customer,
    });

    expect(result.success).toBe(false);
  });

  it('refuses a booking on a date the staff member is on leave', async () => {
    const date = upcomingWeekday();
    await prisma.staffOverride.create({
      data: {
        staffId: tenant.staffId,
        date: new Date(`${date}T00:00:00.000Z`),
        isWorking: false,
      },
    });

    const listing = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    expect(listing.slots).toHaveLength(0);

    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date,
      time: '10:00',
      ...customer,
    });

    expect(result.success).toBe(false);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('books a service that has no staff assignments', async () => {
    // A service created from the dashboard starts with none, and previously
    // could never be booked.
    const service = await prisma.service.create({
      data: {
        workspaceId: tenant.workspaceId,
        name: 'Unassigned Service',
        slug: 'unassigned-service',
        durationMinutes: 30,
        price: 0,
        currency: 'INR',
        locationType: 'ONLINE_MEETING',
        isActive: true,
      },
    });

    const date = upcomingWeekday();
    const { slots } = await getAvailableSlotsAction(tenant.workspaceId, service.id, date);
    expect(slots.length).toBeGreaterThan(0);

    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: service.id,
      date,
      time: slots[0].time,
      staffId: slots[0].staffId,
      ...customer,
    });

    expect(result.success).toBe(true);
  });

  it('stops offering a slot once it is taken', async () => {
    const date = upcomingWeekday();
    const first = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    const target = first.slots[0].time;

    await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date,
      time: target,
      ...customer,
    });

    const second = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    expect(second.slots.map((s) => s.time)).not.toContain(target);
  });

  it('refuses a second booking for the same slot', async () => {
    const date = upcomingWeekday();
    const { slots } = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    const payload = {
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date,
      time: slots[0].time,
    };

    const first = await createPublicBookingAction({ ...payload, ...customer });
    const second = await createPublicBookingAction({
      ...payload,
      customerName: 'Second Customer',
      customerEmail: 'second@example.com',
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('rejects a service id belonging to another workspace', async () => {
    const other = await createTenant('other');

    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: other.serviceId,
      date: upcomingWeekday(),
      time: '10:00',
      ...customer,
    });

    expect(result.success).toBe(false);
    expect(await prisma.booking.count()).toBe(0);
  });

  it('does not return another tenant booking for a reused idempotency key', async () => {
    const other = await createTenant('other');
    const date = upcomingWeekday();
    const { slots } = await getAvailableSlotsAction(other.workspaceId, other.serviceId, date);

    await createPublicBookingAction({
      workspaceId: other.workspaceId,
      serviceId: other.serviceId,
      date,
      time: slots[0].time,
      idempotencyKey: 'shared-key',
      customerName: 'Other Customer',
      customerEmail: 'other-customer@example.com',
    });

    // The same key against a different workspace must not surface that booking.
    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date,
      time: slots[0].time,
      idempotencyKey: 'shared-key',
      ...customer,
    });

    expect(result.staffName).not.toBe('Other Customer');
    if (result.success) {
      const booking = await prisma.booking.findUniqueOrThrow({
        where: { id: result.bookingId! },
      });
      expect(booking.workspaceId).toBe(tenant.workspaceId);
    }
  });

  it('returns the original booking when the same key is replayed', async () => {
    const date = upcomingWeekday();
    const { slots } = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);
    const payload = {
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date,
      time: slots[0].time,
      idempotencyKey: 'double-click',
      ...customer,
    };

    const first = await createPublicBookingAction(payload);
    const second = await createPublicBookingAction(payload);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(second.bookingId).toBe(first.bookingId);
    expect(await prisma.booking.count()).toBe(1);
  });

  it('falls back to the workspace timezone for an unusable customer timezone', async () => {
    const date = upcomingWeekday();
    const { slots } = await getAvailableSlotsAction(tenant.workspaceId, tenant.serviceId, date);

    const result = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date,
      time: slots[0].time,
      customerTimezone: 'Not/AZone',
      ...customer,
    });

    expect(result.success).toBe(true);
    const booking = await prisma.booking.findUniqueOrThrow({ where: { id: result.bookingId! } });
    // Storing the bad value would break every notification for this booking.
    expect(booking.customerTimezone).toBe('Asia/Kolkata');
  });
});
