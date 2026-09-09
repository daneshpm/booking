import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

describe('dynamic off-peak yield pricing', () => {
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
    await __resetRateLimits();
    tenant = await createTenant('yield-pricing');
  });

  /** A weekday (Mon-Fri) in the future as YYYY-MM-DD */
  function upcomingWeekday(weeksAhead = 2): string {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + weeksAhead * 7);
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      d.setUTCDate(d.getUTCDate() + 1);
    }
    return d.toISOString().slice(0, 10);
  }

  it('accurately identifies off-peak slots and discounts session pricing', async () => {
    // 1. Configure off-peak yield pricing on the test service ($100 base price, 25% off between 11:00 and 14:00)
    await prisma.service.update({
      where: { id: tenant.serviceId },
      data: {
        price: 100.0,
        hasYieldPricing: true,
        yieldDiscountPercent: 25,
        yieldDays: '1,2,3,4,5', // Mon through Fri
        yieldStartTime: '11:00',
        yieldEndTime: '14:00',
        yieldLabel: 'Happy Hour 25% Off',
      },
    });

    const testDate = upcomingWeekday();
    const result = await getAvailableSlotsAction(
      tenant.workspaceId,
      tenant.serviceId,
      testDate
    );

    expect(result.success).toBe(true);
    expect(result.slots.length).toBeGreaterThan(0);

    // Peak slot (e.g. 09:00 or 10:00) should not be off-peak
    const peakSlot = result.slots.find((s) => s.time === '09:00' || s.time === '10:00');
    if (peakSlot) {
      expect(peakSlot.isOffPeak).toBeFalsy();
    }

    // Off-peak slot (e.g. 11:00, 11:30, 12:00, 13:00)
    const offPeakSlot = result.slots.find((s) => s.time === '11:00' || s.time === '12:00');
    expect(offPeakSlot).toBeDefined();
    expect(offPeakSlot?.isOffPeak).toBe(true);
    expect(offPeakSlot?.discountPercent).toBe(25);
    expect(offPeakSlot?.discountLabel).toBe('Happy Hour 25% Off');
    expect(offPeakSlot?.originalPrice).toBe(100);
    expect(offPeakSlot?.discountedPrice).toBe(75);
  });

  it('records paid price and applied discount on booking creation for off-peak vs peak slots', async () => {
    await prisma.service.update({
      where: { id: tenant.serviceId },
      data: {
        price: 80.0,
        hasYieldPricing: true,
        yieldDiscountPercent: 20,
        yieldDays: '1,2,3,4,5',
        yieldStartTime: '11:00',
        yieldEndTime: '15:00',
        yieldLabel: 'Lunch Special',
      },
    });

    const testDate = upcomingWeekday();

    // Book an off-peak appointment at 11:00
    const offPeakBooking = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date: testDate,
      time: '11:00',
      customerName: 'Off Peak Buyer',
      customerEmail: 'offpeak@example.com',
    });

    expect(offPeakBooking.success).toBe(true);
    expect(offPeakBooking.bookingId).toBeDefined();

    const savedOffPeak = await prisma.booking.findUnique({
      where: { id: offPeakBooking.bookingId },
    });
    expect(savedOffPeak).toBeDefined();
    expect(savedOffPeak?.source).toBe('ONLINE');
    expect(savedOffPeak?.discountApplied).toBe(20);
    expect(savedOffPeak?.discountLabel).toBe('Lunch Special');
    expect(Number(savedOffPeak?.paidPrice)).toBe(64); // $80 - 20% = $64

    // Book a peak appointment at 09:00
    const peakBooking = await createPublicBookingAction({
      workspaceId: tenant.workspaceId,
      serviceId: tenant.serviceId,
      date: testDate,
      time: '09:00',
      customerName: 'Peak Buyer',
      customerEmail: 'peak@example.com',
    });

    expect(peakBooking.success).toBe(true);
    expect(peakBooking.bookingId).toBeDefined();

    const savedPeak = await prisma.booking.findUnique({
      where: { id: peakBooking.bookingId },
    });
    expect(savedPeak).toBeDefined();
    expect(savedPeak?.discountApplied).toBe(0);
    expect(savedPeak?.discountLabel).toBeNull();
    expect(Number(savedPeak?.paidPrice)).toBe(80); // Full price
  });
});
