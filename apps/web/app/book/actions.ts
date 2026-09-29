'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { toZonedTime, format as formatTz } from 'date-fns-tz';
import {
  generateSlots,
  resolveWorkingWindow,
  localTimeToUtc,
  logger,
  type Slot,
  type TimeRange,
  type WorkingWindow,
} from '@bookings/core';
import { isOverlapConstraintViolation, BookingCapacityExceededError } from '@/lib/booking-errors';
import { requestId } from '@/lib/request-context';
import { createBookingWithCapacityAndParticipants } from '@/lib/booking-capacity';
import { generateMeetingLink } from '@/lib/meeting-link';
import { dispatchBookingNotifications, clearScheduledNotifications } from '@/lib/notifications';
import {
  checkRateLimit,
  callerKey,
  PUBLIC_BOOKING_LIMIT,
  PUBLIC_AVAILABILITY_LIMIT,
  PAYMENT_VERIFY_LIMIT,
  MANAGE_BOOKING_LIMIT,
  WAITLIST_CLAIM_LIMIT,
} from '@/lib/rate-limit';
import {
  addToWaitlist,
  getWaitlistEntryByClaimToken,
  claimWaitlistSpot,
  triggerWaitlistRecovery,
} from '@/lib/waitlist';
import {
  generateICSContent,
  generateGoogleCalendarUrl,
  generateOutlook365Url,
} from '@/lib/calendar';
import {
  createPaymentOrder,
  verifyPayment,
  type PaymentOrderResult,
  type PaymentProvider,
} from '@/lib/payments';

export interface AvailableSlot {
  time: string; // "09:00"
  label: string; // "09:00 AM"
  staffId: string;
  staffName?: string;
  durationMinutes?: number;
  isOffPeak?: boolean;
  discountPercent?: number;
  discountLabel?: string;
  originalPrice?: number;
  discountedPrice?: number;
  /** Seats still open at this slot. Only set for a group service (capacity > 1). */
  remainingCapacity?: number;
}

export interface BookingFormData {
  workspaceId: string;
  serviceId: string;
  staffId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes?: string;
  customerTimezone?: string;
  selectedAddonIds?: string[];
  intakeResponses?: Record<string, any>;
  idempotencyKey?: string;
}

export interface BookingResult {
  success: boolean;
  requiresPayment?: boolean;
  paymentOrder?: PaymentOrderResult;
  paymentStatus?: string;
  paymentProvider?: string;
  currency?: string;
  bookingId?: string;
  manageToken?: string;
  manageUrl?: string;
  meetingLink?: string;
  startTime?: string;
  endTime?: string;
  serviceName?: string;
  staffName?: string;
  paidPrice?: number;
  selectedAddons?: Array<{ name: string; durationMinutes: number; price: number }>;
  intakeResponses?: Record<string, any>;
  googleCalendarUrl?: string;
  outlookCalendarUrl?: string;
  icsContent?: string;
  error?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Log a failure with the id of the request that caused it.
 *
 * This is the most exposed code in the product and the least observable: every
 * failure here used to be a bare sentence on stdout, so a customer reporting
 * "it would not let me book" could not be matched to the line it wrote. The
 * logger redacts the payloads, which routinely carry customer names, addresses
 * and phone numbers.
 *
 * Not exported: a `'use server'` module may only export async functions that
 * are safe to expose as endpoints.
 */
async function logFailure(message: string, fields: Record<string, unknown>): Promise<void> {
  logger.error(message, { requestId: await requestId(), ...fields });
}

/** Reject a timezone the formatter cannot resolve, before it is persisted. */
function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Calendar date as the booking UI submits it. */
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Day of week in the schema's convention: 0 = Sunday through 6 = Saturday. */
function dayOfWeekFor(date: string): number {
  // Anchored at noon so the value cannot slip a day through a timezone offset.
  return new Date(`${date}T12:00:00`).getDay();
}

/** A busy range, tagged with which service it came from when it is this
 * staff member's own booking (null for a collective-booking commitment,
 * which has no single owning service from this staff member's point of
 * view). The tag lets a group service's own bookings be told apart from
 * every other reason this staff member is unavailable. */
interface BusyRange extends TimeRange {
  serviceId: string | null;
}

interface StaffSchedule {
  staffId: string;
  staffName: string;
  window: WorkingWindow;
  busy: BusyRange[];
}

/**
 * Load the working window and existing appointments for each candidate staff
 * member on one date.
 *
 * Shared by slot listing and booking creation so both apply the same rules; two
 * implementations would drift and let a booking through that the page never
 * offered.
 */
async function loadSchedules(
  candidates: Array<{ id: string; name: string }>,
  date: string,
  timezone: string
): Promise<StaffSchedule[]> {
  const dayOfWeek = dayOfWeekFor(date);
  const dayStart = localTimeToUtc(date, '00:00', timezone);
  if (!dayStart) return [];

  // A window wider than the day, so an appointment that began the previous
  // evening and runs past midnight is still considered.
  const windowStart = new Date(dayStart.getTime() - 24 * 60 * 60 * 1000);
  const windowEnd = new Date(dayStart.getTime() + 48 * 60 * 60 * 1000);

  const targetDate = new Date(`${date}T00:00:00.000Z`);
  const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

  const schedules: StaffSchedule[] = [];
  const staffIds = candidates.map((staff) => staff.id);
  if (staffIds.length === 0) return [];

  // Four queries for the whole candidate set rather than four per candidate.
  // Collective and resource bookings can make that set large, and the old
  // per-candidate loop was sequential, so its cost grew with the pool.
  const [weeklyRows, overrideRows, bookingRows, participationRows] = await Promise.all([
    prisma.staffWorkingHours.findMany({
      where: { staffId: { in: staffIds }, dayOfWeek },
      include: { breaks: true },
    }),
    prisma.staffOverride.findMany({
      where: { staffId: { in: staffIds }, date: { gte: targetDate, lt: nextDate } },
    }),
    prisma.booking.findMany({
      where: {
        staffId: { in: staffIds },
        status: { notIn: ['CANCELLED'] },
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
      },
      select: { staffId: true, startTime: true, endTime: true, serviceId: true },
    }),
    // A collective booking elsewhere commits this staff member's time just
    // as much as one of their own bookings does, even though it lives in a
    // different table.
    prisma.bookingParticipant.findMany({
      where: {
        staffId: { in: staffIds },
        status: { notIn: ['CANCELLED'] },
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
      },
      select: { staffId: true, startTime: true, endTime: true },
    }),
  ]);

  const weeklyByStaff = new Map(weeklyRows.map((row) => [row.staffId, row]));
  // First row wins, matching the findFirst this replaced.
  const overrideByStaff = new Map<string, (typeof overrideRows)[number]>();
  for (const row of overrideRows) {
    if (!overrideByStaff.has(row.staffId)) overrideByStaff.set(row.staffId, row);
  }
  const busyByStaff = new Map<string, StaffSchedule['busy']>();
  for (const row of bookingRows) {
    const list = busyByStaff.get(row.staffId) ?? [];
    list.push({ start: row.startTime, end: row.endTime, serviceId: row.serviceId });
    busyByStaff.set(row.staffId, list);
  }
  for (const row of participationRows) {
    const list = busyByStaff.get(row.staffId) ?? [];
    list.push({ start: row.startTime, end: row.endTime, serviceId: null });
    busyByStaff.set(row.staffId, list);
  }

  // Iterating the candidates, not the rows, so the order the caller gave is
  // preserved — the routing strategy depends on it.
  for (const staff of candidates) {
    const weekly = weeklyByStaff.get(staff.id) ?? null;
    const override = overrideByStaff.get(staff.id) ?? null;

    const window = resolveWorkingWindow(
      weekly
        ? {
            startTime: weekly.startTime,
            endTime: weekly.endTime,
            breaks: weekly.breaks.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
          }
        : null,
      override
        ? {
            isWorking: override.isWorking,
            startTime: override.startTime,
            endTime: override.endTime,
          }
        : null
    );

    if (!window) continue;

    schedules.push({
      staffId: staff.id,
      staffName: staff.name,
      window,
      busy: busyByStaff.get(staff.id) ?? [],
    });
  }

  return schedules;
}

/**
 * Staff who may deliver a service.
 *
 * Falls back to every active staff member when the service has no explicit
 * assignments, because a freshly created service has none and would otherwise
 * be impossible to book.
 */
async function candidateStaff(
  workspaceId: string,
  service: {
    staffAssignments: Array<{ staff: { id: string; name: string; isActive: boolean } }>;
    routingStrategy?: string | null;
  },
  preferredStaffId?: string
): Promise<Array<{ id: string; name: string }>> {
  const assigned = service.staffAssignments.map((a) => a.staff).filter((s) => s.isActive);

  const pool =
    assigned.length > 0
      ? assigned
      : await prisma.staff.findMany({
          where: { workspaceId, isActive: true },
          select: { id: true, name: true, isActive: true },
          orderBy: { name: 'asc' },
        });

  // A collective (ALL_REQUIRED) service needs every assigned staff member at
  // once, not "whichever one the caller prefers" — narrowing the pool here
  // would let any public caller collapse it to one staffId and silently turn
  // an ALL_REQUIRED booking into a one-on-one with no other required staff
  // ever checked or recorded.
  if (preferredStaffId && service.routingStrategy !== 'ALL_REQUIRED') {
    const matched = pool.filter((s) => s.id === preferredStaffId);
    if (matched.length > 0) {
      return matched.map((s) => ({ id: s.id, name: s.name }));
    }
  }
  return pool.map((s) => ({ id: s.id, name: s.name }));
}

/**
 * Calculate bookable slots for a service on a date.
 *
 * Honours each candidate's weekly hours, breaks and date overrides, applies the
 * service's buffers, and excludes times already taken.
 */
export async function getAvailableSlotsAction(
  workspaceId: string,
  serviceId: string,
  date: string,
  preferredStaffId?: string,
  selectedAddonIds?: string[]
): Promise<{ success: boolean; slots: AvailableSlot[]; error?: string }> {
  try {
    if (!workspaceId || !serviceId || !date) {
      return { success: false, slots: [], error: 'Missing required parameters.' };
    }
    if (!DATE_PATTERN.test(date)) {
      return { success: false, slots: [], error: 'Please choose a valid date.' };
    }

    const throttle = await checkRateLimit(
      await callerKey('availability'),
      PUBLIC_AVAILABILITY_LIMIT
    );
    if (!throttle.allowed) {
      return {
        success: false,
        slots: [],
        error: 'Too many requests. Please wait a moment and try again.',
      };
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace || !workspace.isActive) {
      return { success: false, slots: [], error: 'Workspace not found.' };
    }

    // Scoped to the workspace so an id from another tenant cannot resolve.
    const service = await prisma.service.findFirst({
      where: { id: serviceId, workspaceId, isActive: true },
      include: { staffAssignments: { include: { staff: true } } },
    });
    if (!service) {
      return { success: false, slots: [], error: 'Service not found or is currently inactive.' };
    }

    const timezone = workspace.timezone || 'UTC';
    const candidates = await candidateStaff(workspaceId, service, preferredStaffId);
    if (candidates.length === 0) {
      return { success: true, slots: [] };
    }

    const schedules = await loadSchedules(candidates, date, timezone);

    // Calculate effective duration and price including any selected add-ons
    const rawAddons =
      (service.addons as Array<{
        id: string;
        name: string;
        durationMinutes: number;
        price: number;
      }>) || [];
    const activeAddons =
      selectedAddonIds && selectedAddonIds.length > 0
        ? rawAddons.filter((a) => selectedAddonIds.includes(a.id))
        : [];
    const extraDuration = activeAddons.reduce(
      (sum, a) => sum + (Number(a.durationMinutes) || 0),
      0
    );
    const extraPrice = activeAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const effectiveDuration = (service.durationMinutes || 30) + extraDuration;
    const baseCombinedPrice = Number(service.price) + extraPrice;

    // Dynamic Off-Peak Yield Pricing evaluation setup
    const slotDayOfWeek = dayOfWeekFor(date);
    const hasYield = Boolean(
      service.hasYieldPricing && service.yieldDiscountPercent && service.yieldDiscountPercent > 0
    );
    let allowedDays: number[] = [];
    if (hasYield && service.yieldDays) {
      allowedDays = service.yieldDays
        .split(',')
        .map((d) => parseInt(d.trim(), 10))
        .filter((d) => !isNaN(d));
    }

    // Captured as locals rather than read from `service` inside the closure
    // below: TypeScript does not carry the `!service` null-check's narrowing
    // into a nested function body.
    const yieldStartTime = service.yieldStartTime;
    const yieldEndTime = service.yieldEndTime;
    const yieldDiscountPercent = service.yieldDiscountPercent;
    const yieldLabel = service.yieldLabel;

    /** Off-peak pricing fields for one local time, shared by every branch below. */
    function yieldFieldsFor(localTime: string) {
      const isDayEligible =
        hasYield && (allowedDays.length === 0 || allowedDays.includes(slotDayOfWeek));
      const isTimeEligible =
        isDayEligible &&
        (!yieldStartTime || localTime >= yieldStartTime) &&
        (!yieldEndTime || localTime < yieldEndTime);

      if (!isTimeEligible || !yieldDiscountPercent) {
        return { isOffPeak: false, originalPrice: baseCombinedPrice };
      }
      const discountPercent = yieldDiscountPercent;
      return {
        isOffPeak: true,
        discountPercent,
        discountLabel: yieldLabel || 'Off-Peak Special',
        originalPrice: baseCombinedPrice,
        discountedPrice: Math.round(baseCombinedPrice * (1 - discountPercent / 100) * 100) / 100,
      };
    }

    const isGroupService = Boolean(service.capacity && service.capacity > 1);
    // A collective service needs every assigned staff member simultaneously,
    // not "whichever one is free first" — meaningless with a single candidate.
    // Based on the required pool (candidates), not on how many of them ended
    // up with a schedule that day: a panelist with no working hours at all
    // that day must not silently drop the requirement to "whoever's left".
    const isCollective = service.routingStrategy === 'ALL_REQUIRED' && candidates.length > 1;

    if (isCollective && schedules.length < candidates.length) {
      // At least one required staff member has no working window on this
      // date at all, so no time can honestly be offered as "everyone is
      // free" — the intersection below would otherwise be computed only
      // among whoever does have a schedule, silently ignoring the missing
      // required staff member entirely.
      return { success: true, slots: [] };
    }

    const perStaff = schedules.map((schedule) => {
      // A group service's own past bookings for this slot are capacity used,
      // not a reason to hide the slot outright, so they are pulled out of the
      // set that blocks it and counted separately below instead.
      const blockingBusy = isGroupService
        ? schedule.busy.filter((b) => b.serviceId !== service.id)
        : schedule.busy;

      const slots = generateSlots({
        date,
        timezone,
        window: schedule.window,
        durationMinutes: effectiveDuration,
        bufferBeforeMinutes: service.bufferBeforeMinutes || 0,
        bufferAfterMinutes: service.bufferAfterMinutes || 0,
        busy: blockingBusy,
      });

      return { schedule, slots };
    });

    const byTime = new Map<string, AvailableSlot>();

    if (isCollective) {
      // Only offer a time every required staff member actually has free.
      const localTimeSets = perStaff.map((p) => new Set(p.slots.map((s) => s.localTime)));
      const commonTimes = [...localTimeSets[0]].filter((t) =>
        localTimeSets.every((set) => set.has(t))
      );

      for (const localTime of commonTimes) {
        const primarySlot = perStaff[0].slots.find((s) => s.localTime === localTime)!;
        byTime.set(localTime, {
          time: localTime,
          label: primarySlot.label,
          staffId: perStaff[0].schedule.staffId,
          staffName: perStaff.map((p) => p.schedule.staffName).join(' + '),
          durationMinutes: effectiveDuration,
          ...yieldFieldsFor(localTime),
        });
      }
    } else {
      for (const { schedule, slots } of perStaff) {
        // Existing bookings of this same group service for this staff member,
        // checked for actual time-range overlap against each candidate slot
        // below rather than exact start-time equality: add-ons make effective
        // duration vary per booking, so two bookings of the same group
        // service can genuinely overlap while starting at different grid
        // times, and an exact-match count would miss that entirely.
        const ownServiceBookings = isGroupService
          ? schedule.busy.filter((b) => b.serviceId === service.id)
          : [];

        for (const slot of slots) {
          if (byTime.has(slot.localTime)) continue;

          let remainingCapacity: number | undefined;
          if (isGroupService) {
            const used = ownServiceBookings.filter(
              (b) =>
                b.start.getTime() < slot.endUtc.getTime() &&
                b.end.getTime() > slot.startUtc.getTime()
            ).length;
            remainingCapacity = (service.capacity as number) - used;
            if (remainingCapacity <= 0) continue;
          }

          byTime.set(slot.localTime, {
            time: slot.localTime,
            label: slot.label,
            staffId: schedule.staffId,
            staffName: schedule.staffName,
            durationMinutes: effectiveDuration,
            remainingCapacity,
            ...yieldFieldsFor(slot.localTime),
          });
        }
      }
    }

    const slots = Array.from(byTime.values()).sort((a, b) => a.time.localeCompare(b.time));
    return { success: true, slots };
  } catch (error) {
    // The raw message can carry query or schema detail, so it is logged rather
    // than returned to the browser.
    await logFailure('Error calculating availability', { err: error });
    return { success: false, slots: [], error: 'Could not load available times.' };
  }
}

/**
 * Create a booking from the public booking page.
 *
 * This endpoint is unauthenticated, so every value it receives is untrusted.
 * The service and staff are resolved scoped to the workspace, and the requested
 * time is re-checked against the same availability engine that produced the
 * page. Trusting the submitted time would let a hand-built request book a rest
 * day or the middle of a lunch break.
 */
export async function createPublicBookingAction(data: BookingFormData): Promise<BookingResult> {
  try {
    const { workspaceId, serviceId, date, time } = data;
    const customerName = data.customerName?.trim() ?? '';
    const customerEmail = data.customerEmail?.toLowerCase().trim() ?? '';

    if (!workspaceId || !serviceId || !date || !time || !customerName || !customerEmail) {
      return { success: false, error: 'Missing required booking fields.' };
    }
    if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) {
      return { success: false, error: 'Please choose a valid date and time.' };
    }
    if (!EMAIL_PATTERN.test(customerEmail) || customerEmail.length > 320) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (customerName.length > 200) {
      return { success: false, error: 'Please enter a shorter name.' };
    }

    // Unauthenticated, and it writes rows and sends email, so it is capped.
    const throttle = await checkRateLimit(await callerKey('booking'), PUBLIC_BOOKING_LIMIT);
    if (!throttle.allowed) {
      const minutes = Math.ceil((throttle.retryAfterSeconds ?? 60) / 60);
      return {
        success: false,
        error: `Too many booking attempts. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      };
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace || !workspace.isActive) {
      return { success: false, error: 'Workspace not found.' };
    }

    const timezone = workspace.timezone || 'UTC';

    // An unresolvable timezone would be stored and then break every
    // notification for this booking, silently and permanently.
    const customerTimezone =
      data.customerTimezone && isValidTimezone(data.customerTimezone)
        ? data.customerTimezone
        : timezone;

    // The key is scoped to the workspace, so one tenant cannot read another
    // tenant's booking by guessing or reusing a key.
    if (data.idempotencyKey) {
      const existing = await prisma.booking.findFirst({
        where: { workspaceId, idempotencyKey: data.idempotencyKey },
        include: { service: true, staff: true },
      });
      if (existing) {
        return {
          success: true,
          bookingId: existing.id,
          meetingLink: existing.meetingLink ?? undefined,
          startTime: formatTz(
            toZonedTime(existing.startTime, timezone),
            'EEEE, MMMM d, yyyy - h:mm a',
            { timeZone: timezone }
          ),
          endTime: formatTz(toZonedTime(existing.endTime, timezone), 'h:mm a', {
            timeZone: timezone,
          }),
          serviceName: existing.service.name,
          staffName: existing.staff.name,
        };
      }
    }

    // Scoped lookup: a service id belonging to another workspace must not
    // resolve, or one tenant's catalogue could be booked through another's page.
    const service = await prisma.service.findFirst({
      where: { id: serviceId, workspaceId, isActive: true },
      include: { staffAssignments: { include: { staff: true } } },
    });
    if (!service) {
      return { success: false, error: 'Service not found or is no longer available.' };
    }

    const candidates = await candidateStaff(workspaceId, service, data.staffId);
    if (candidates.length === 0) {
      return {
        success: false,
        error: data.staffId
          ? 'The selected staff member is not available for this service.'
          : 'No staff are available for this service.',
      };
    }

    const requestedStart = localTimeToUtc(date, time, timezone);
    if (!requestedStart) {
      return { success: false, error: 'That time does not exist on the selected date.' };
    }

    const schedules = await loadSchedules(candidates, date, timezone);

    // Calculate effective duration and price including any selected add-ons
    const rawAddons =
      (service.addons as Array<{
        id: string;
        name: string;
        durationMinutes: number;
        price: number;
      }>) || [];
    const activeAddons =
      data.selectedAddonIds && data.selectedAddonIds.length > 0
        ? rawAddons.filter((a) => data.selectedAddonIds!.includes(a.id))
        : [];
    const extraDuration = activeAddons.reduce(
      (sum, a) => sum + (Number(a.durationMinutes) || 0),
      0
    );
    const extraPrice = activeAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);
    const effectiveDuration = (service.durationMinutes || 30) + extraDuration;
    const baseCombinedPrice = Number(service.price) + extraPrice;

    const isGroupService = Boolean(service.capacity && service.capacity > 1);
    // Based on the required pool (candidates), not on how many of them ended
    // up with a schedule that day — see getAvailableSlotsAction for why.
    const isCollective = service.routingStrategy === 'ALL_REQUIRED' && candidates.length > 1;

    if (isCollective && schedules.length < candidates.length) {
      return {
        success: false,
        error:
          'One of the required team members is not working that day. Please choose another slot.',
      };
    }

    // Re-run the same engine that produced the page and match available staff
    const eligibleMatches: Array<{ staffId: string; staffName: string; slot: Slot }> = [];
    for (const schedule of schedules) {
      // Mirrors getAvailableSlotsAction: a group service's own bookings at
      // this exact slot are capacity used, not a conflict, so they must not
      // block the slot the page just offered from being re-confirmed here.
      const blockingBusy = isGroupService
        ? schedule.busy.filter((b) => b.serviceId !== service.id)
        : schedule.busy;

      const match = generateSlots({
        date,
        timezone,
        window: schedule.window,
        durationMinutes: effectiveDuration,
        bufferBeforeMinutes: service.bufferBeforeMinutes || 0,
        bufferAfterMinutes: service.bufferAfterMinutes || 0,
        busy: blockingBusy,
      }).find((slot) => slot.startUtc.getTime() === requestedStart.getTime());

      if (match) {
        eligibleMatches.push({
          staffId: schedule.staffId,
          staffName: schedule.staffName,
          slot: match,
        });
      }
    }

    if (eligibleMatches.length === 0) {
      return {
        success: false,
        error: 'That time is no longer available. Please choose another slot.',
      };
    }

    // A collective booking needs every required staff member free at once;
    // one or more having lost the slot since the page loaded means the whole
    // booking cannot go ahead, not that it proceeds with whoever is left.
    if (isCollective && eligibleMatches.length < candidates.length) {
      return {
        success: false,
        error:
          'One of the required team members is no longer available at that time. Please choose another slot.',
      };
    }

    let chosen = eligibleMatches[0];
    if (isCollective) {
      // No further selection: every matched staff member participates.
    } else if (data.staffId) {
      const explicit = eligibleMatches.find((e) => e.staffId === data.staffId);
      if (explicit) {
        chosen = explicit;
      }
    } else if (service.routingStrategy === 'ROUND_ROBIN' && eligibleMatches.length > 1) {
      const staffIds = eligibleMatches.map((e) => e.staffId);
      const bookingCounts = await prisma.booking.groupBy({
        by: ['staffId'],
        where: { staffId: { in: staffIds }, status: { in: ['CONFIRMED'] } },
        _count: { id: true },
      });
      const countMap = new Map(bookingCounts.map((b) => [b.staffId, b._count.id]));
      eligibleMatches.sort(
        (a, b) => (countMap.get(a.staffId) || 0) - (countMap.get(b.staffId) || 0)
      );
      chosen = eligibleMatches[0];
    }

    // The rest of the required team for a collective booking: recorded as
    // BookingParticipant rows alongside the primary Booking.
    const otherParticipants = isCollective
      ? eligibleMatches.filter((e) => e.staffId !== chosen.staffId)
      : [];

    const customer = await prisma.customer.upsert({
      where: { workspaceId_email: { workspaceId, email: customerEmail } },
      update: {
        name: customerName,
        phone: data.customerPhone?.trim().slice(0, 50) || undefined,
        notes: data.customerNotes?.trim().slice(0, 2000) || undefined,
      },
      create: {
        workspaceId,
        name: customerName,
        email: customerEmail,
        phone: data.customerPhone?.trim().slice(0, 50) || undefined,
        notes: data.customerNotes?.trim().slice(0, 2000) || undefined,
      },
    });

    // meetingLink holds a URL, so a non-online service leaves it null and the
    // service's own location details are shown to the customer instead.
    const meetingLink = service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null;

    // Dynamic Off-Peak Yield Pricing calculation for persisted booking
    let paidPrice: number = baseCombinedPrice;
    let discountApplied = 0;
    let discountLabel: string | null = null;

    if (
      service.hasYieldPricing &&
      service.yieldDiscountPercent &&
      service.yieldDiscountPercent > 0
    ) {
      const slotDayOfWeek = dayOfWeekFor(date);
      let allowedDays: number[] = [];
      if (service.yieldDays) {
        allowedDays = service.yieldDays
          .split(',')
          .map((d) => parseInt(d.trim(), 10))
          .filter((d) => !isNaN(d));
      }
      const isDayEligible = allowedDays.length === 0 || allowedDays.includes(slotDayOfWeek);
      const isTimeEligible =
        isDayEligible &&
        (!service.yieldStartTime || time >= service.yieldStartTime) &&
        (!service.yieldEndTime || time < service.yieldEndTime);

      if (isTimeEligible) {
        discountApplied = service.yieldDiscountPercent;
        discountLabel = service.yieldLabel || 'Off-Peak Special';
        paidPrice = Math.round(baseCombinedPrice * (1 - discountApplied / 100) * 100) / 100;
      }
    }

    const manageToken = `mng_${crypto.randomUUID().replace(/-/g, '')}`;
    const isFree = paidPrice === 0;

    if (isFree) {
      // FREE SESSION: Confirm immediately, generate meeting link and send invites
      const booking = await createBookingWithCapacityAndParticipants(
        {
          workspaceId,
          serviceId: service.id,
          staffId: chosen.staffId,
          customerId: customer.id,
          startTime: chosen.slot.startUtc,
          endTime: chosen.slot.endUtc,
          customerTimezone,
          status: 'CONFIRMED',
          paymentStatus: 'PAID',
          paymentProvider: 'FREE',
          paidAt: new Date(),
          source: 'ONLINE',
          paidPrice: 0,
          discountApplied,
          discountLabel,
          isGroupBooking: isGroupService,
          selectedAddons: (activeAddons.length > 0 ? activeAddons : null) as any,
          intakeResponses: (data.intakeResponses ? data.intakeResponses : null) as any,
          manageToken,
          meetingLink,
          idempotencyKey: data.idempotencyKey || null,
          auditLogs: {
            create: {
              action: 'CREATED',
              actorType: 'CUSTOMER',
              actorId: customer.id,
              details: {
                customerEmail: customer.email,
                serviceName: service.name,
                bookedAt: new Date().toISOString(),
                addons: activeAddons,
                intakeResponses: data.intakeResponses,
                isFreeSession: true,
              },
            },
          },
        },
        {
          isGroupService,
          serviceId: service.id,
          staffId: chosen.staffId,
          startUtc: chosen.slot.startUtc,
          endUtc: chosen.slot.endUtc,
          capacity: service.capacity ?? null,
          participants: otherParticipants.map((p) => ({
            staffId: p.staffId,
            startUtc: p.slot.startUtc,
            endUtc: p.slot.endUtc,
          })),
        }
      );

      // A failed email must not undo a booking the customer already completed.
      await dispatchBookingNotifications(booking.id, 'BOOKING_CREATED').catch(
        (err) => void logFailure('Booking notification dispatch failed', { err })
      );

      revalidatePath('/calendar');
      revalidatePath('/appointments');
      revalidatePath('/customers');

      const calendarEvent = {
        title: `${service.name} with ${chosen.staffName}`,
        description: `Appointment for ${service.name} at ${workspace.name}.\n${meetingLink ? `Video Meeting Link: ${meetingLink}\n` : ''}${customerName ? `Client: ${customerName}\n` : ''}`,
        location: meetingLink || (service.locationDetails ?? workspace.name),
        startTime: chosen.slot.startUtc,
        endTime: chosen.slot.endUtc,
        organizerName: workspace.name,
        uid: booking.id,
      };

      const googleCalendarUrl = generateGoogleCalendarUrl(calendarEvent);
      const outlookCalendarUrl = generateOutlook365Url(calendarEvent);
      const icsContent = generateICSContent(calendarEvent);
      const manageUrl = `/book/manage/${manageToken}`;

      return {
        success: true,
        requiresPayment: false,
        bookingId: booking.id,
        manageToken,
        manageUrl,
        meetingLink: meetingLink ?? undefined,
        startTime: formatTz(
          toZonedTime(chosen.slot.startUtc, timezone),
          'EEEE, MMMM d, yyyy - h:mm a',
          { timeZone: timezone }
        ),
        endTime: formatTz(toZonedTime(chosen.slot.endUtc, timezone), 'h:mm a', {
          timeZone: timezone,
        }),
        serviceName: service.name,
        staffName: chosen.staffName,
        paidPrice: 0,
        currency: service.currency || workspace.currency || 'USD',
        selectedAddons: activeAddons,
        intakeResponses: data.intakeResponses,
        googleCalendarUrl,
        outlookCalendarUrl,
        icsContent,
      };
    }

    // PAID SESSION: Create PENDING booking and initiate payment order
    const currency = service.currency || workspace.currency || 'USD';
    const booking = await createBookingWithCapacityAndParticipants(
      {
        workspaceId,
        serviceId: service.id,
        staffId: chosen.staffId,
        customerId: customer.id,
        startTime: chosen.slot.startUtc,
        endTime: chosen.slot.endUtc,
        customerTimezone,
        status: 'PENDING',
        paymentStatus: 'UNPAID',
        source: 'ONLINE',
        paidPrice,
        paymentCurrency: currency,
        discountApplied,
        discountLabel,
        isGroupBooking: isGroupService,
        selectedAddons: (activeAddons.length > 0 ? activeAddons : null) as any,
        intakeResponses: (data.intakeResponses ? data.intakeResponses : null) as any,
        manageToken,
        meetingLink: null, // Generated only upon payment confirmation
        idempotencyKey: data.idempotencyKey || null,
        auditLogs: {
          create: {
            action: 'CREATED_PENDING_PAYMENT',
            actorType: 'CUSTOMER',
            actorId: customer.id,
            details: {
              customerEmail: customer.email,
              serviceName: service.name,
              bookedAt: new Date().toISOString(),
              addons: activeAddons,
              paidPrice,
              currency,
            },
          },
        },
      },
      {
        isGroupService,
        serviceId: service.id,
        staffId: chosen.staffId,
        startUtc: chosen.slot.startUtc,
        endUtc: chosen.slot.endUtc,
        capacity: service.capacity ?? null,
        participants: otherParticipants.map((p) => ({
          staffId: p.staffId,
          startUtc: p.slot.startUtc,
          endUtc: p.slot.endUtc,
        })),
      }
    );

    const paymentOrder = await createPaymentOrder({
      bookingId: booking.id,
      amount: paidPrice,
      currency,
      customerName,
      customerEmail,
      customerPhone: data.customerPhone,
      serviceName: service.name,
      workspaceName: workspace.name,
    });

    if (!paymentOrder.success) {
      // Clean up pending booking if order initiation fails
      await prisma.booking.delete({ where: { id: booking.id } }).catch(() => {});
      return {
        success: false,
        error: paymentOrder.error || 'Failed to initialize payment gateway checkout.',
      };
    }

    // Attach order ID & provider to booking
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        paymentOrderId: paymentOrder.orderId,
        paymentProvider: paymentOrder.provider,
      },
    });

    const manageUrl = `/book/manage/${manageToken}`;

    return {
      success: true,
      requiresPayment: true,
      bookingId: booking.id,
      paymentOrder,
      manageToken,
      manageUrl,
      startTime: formatTz(
        toZonedTime(chosen.slot.startUtc, timezone),
        'EEEE, MMMM d, yyyy - h:mm a',
        { timeZone: timezone }
      ),
      endTime: formatTz(toZonedTime(chosen.slot.endUtc, timezone), 'h:mm a', {
        timeZone: timezone,
      }),
      serviceName: service.name,
      staffName: chosen.staffName,
      paidPrice,
      currency,
      selectedAddons: activeAddons,
      intakeResponses: data.intakeResponses,
    };
  } catch (error) {
    if (error instanceof BookingCapacityExceededError) {
      return {
        success: false,
        error: 'That session just reached capacity. Please select another slot.',
      };
    }
    if (isOverlapConstraintViolation(error)) {
      return {
        success: false,
        error: 'This time slot was just booked. Please select another slot.',
      };
    }
    await logFailure('Error creating booking', { err: error });
    return { success: false, error: 'We could not complete your booking. Please try again.' };
  }
}

// ----------------------------------------------------
// PUBLIC SMART WAITLIST & INSTANT CLAIM ACTIONS
// ----------------------------------------------------

export interface JoinWaitlistInput {
  workspaceId: string;
  serviceId: string;
  staffId?: string;
  preferredDate: string; // YYYY-MM-DD
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export async function joinPublicWaitlistAction(data: JoinWaitlistInput) {
  try {
    if (!data.workspaceId || !data.serviceId || !data.preferredDate) {
      return { success: false, error: 'Please select a service and date.' };
    }
    if (!data.customerName?.trim() || !data.customerEmail?.trim()) {
      return { success: false, error: 'Please enter your name and email address.' };
    }
    if (!DATE_ONLY_PATTERN.test(data.preferredDate)) {
      return { success: false, error: 'Please choose a valid date.' };
    }

    // Unauthenticated write, so it is throttled like the other public actions.
    // Without a limit anyone can fill a workspace's waitlist from a script.
    const throttle = await checkRateLimit(await callerKey('waitlist'), PUBLIC_BOOKING_LIMIT);
    if (!throttle.allowed) {
      return {
        success: false,
        error: 'Too many requests. Please wait a moment and try again.',
      };
    }

    // workspaceId and serviceId both arrive from the browser. Resolving the
    // service inside the workspace stops one tenant's service being attached to
    // another tenant's waitlist by editing the request.
    const service = await prisma.service.findFirst({
      where: { id: data.serviceId, workspaceId: data.workspaceId, isActive: true },
      select: { id: true },
    });
    if (!service) {
      return { success: false, error: 'That service is not available for booking.' };
    }

    const staffId = data.staffId && data.staffId !== 'ANY' ? data.staffId : null;
    if (staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: staffId, workspaceId: data.workspaceId, isActive: true },
        select: { id: true },
      });
      if (!staff) {
        return { success: false, error: 'That team member is not available.' };
      }
    }

    return await addToWaitlist({ ...data, staffId });
  } catch (err) {
    await logFailure('Join waitlist failed', { err });
    return { success: false, error: 'Failed to join the waitlist. Please try again.' };
  }
}

export async function getClaimSpotDetailsAction(token: string) {
  try {
    const throttle = await checkRateLimit(await callerKey('waitlist-claim'), WAITLIST_CLAIM_LIMIT);
    if (!throttle.allowed) {
      return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
    }

    const entry = await getWaitlistEntryByClaimToken(token);
    if (!entry) {
      return { success: false, error: 'Claim link is invalid or has expired.' };
    }
    return {
      success: true,
      entry: {
        id: entry.id,
        status: entry.status,
        customerName: entry.customerName,
        customerEmail: entry.customerEmail,
        serviceName: entry.service.name,
        serviceDuration: entry.service.durationMinutes,
        servicePrice: entry.service.price ? Number(entry.service.price) : 0,
        staffName: entry.staff?.name || 'Assigned Staff Specialist',
        preferredDate: entry.preferredDate.toISOString().split('T')[0],
        workspaceName: entry.workspace.name,
      },
    };
  } catch (err) {
    await logFailure('Claim spot lookup failed', { err });
    return { success: false, error: 'Failed to load spot details.' };
  }
}

export async function claimPublicWaitlistSpotAction(token: string) {
  try {
    const throttle = await checkRateLimit(await callerKey('waitlist-claim'), WAITLIST_CLAIM_LIMIT);
    if (!throttle.allowed) {
      return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
    }

    const res = await claimWaitlistSpot(token);
    if (res.success) {
      revalidatePath('/calendar');
      revalidatePath('/appointments');
    }
    return res;
  } catch (err) {
    await logFailure('Claim waitlist spot failed', { err });
    return { success: false, error: 'Could not claim the appointment slot. Please try again.' };
  }
}

// ----------------------------------------------------
// CUSTOMER SELF-SERVICE RESCHEDULE & CANCEL ACTIONS
// ----------------------------------------------------

export async function getBookingByManageTokenAction(token: string) {
  try {
    if (!token) {
      return { success: false, error: 'Manage token is required.' };
    }

    const throttle = await checkRateLimit(await callerKey('manage-booking'), MANAGE_BOOKING_LIMIT);
    if (!throttle.allowed) {
      return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
    }

    const booking = await prisma.booking.findUnique({
      where: { manageToken: token },
      include: {
        workspace: true,
        service: true,
        staff: true,
        customer: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Appointment not found or link has expired.' };
    }

    const tz = booking.customerTimezone || booking.workspace.timezone || 'UTC';

    const calendarEvent = {
      title: `${booking.service.name} with ${booking.staff.name}`,
      description: `Appointment for ${booking.service.name} at ${booking.workspace.name}.\n${booking.meetingLink ? `Video Link: ${booking.meetingLink}\n` : ''}`,
      location: booking.meetingLink || (booking.service.locationDetails ?? booking.workspace.name),
      startTime: booking.startTime,
      endTime: booking.endTime,
      organizerName: booking.workspace.name,
      uid: booking.id,
    };

    return {
      success: true,
      booking: {
        id: booking.id,
        manageToken: booking.manageToken,
        status: booking.status,
        startTimeIso: booking.startTime.toISOString(),
        endTimeIso: booking.endTime.toISOString(),
        formattedDate: formatTz(toZonedTime(booking.startTime, tz), 'EEEE, MMMM d, yyyy', {
          timeZone: tz,
        }),
        formattedTime: `${formatTz(toZonedTime(booking.startTime, tz), 'h:mm a', { timeZone: tz })} - ${formatTz(toZonedTime(booking.endTime, tz), 'h:mm a', { timeZone: tz })}`,
        timezone: tz,
        meetingLink: booking.meetingLink,
        paidPrice: booking.paidPrice ? Number(booking.paidPrice) : Number(booking.service.price),
        currency: booking.service.currency || 'USD',
        discountApplied: booking.discountApplied,
        discountLabel: booking.discountLabel,
        selectedAddons: (booking.selectedAddons as any) || [],
        intakeResponses: (booking.intakeResponses as any) || null,
        cancellationReason: booking.cancellationReason,
        service: {
          id: booking.service.id,
          name: booking.service.name,
          slug: booking.service.slug,
          description: booking.service.description,
          durationMinutes: booking.service.durationMinutes,
          locationType: booking.service.locationType,
          locationDetails: booking.service.locationDetails,
        },
        staff: {
          id: booking.staff.id,
          name: booking.staff.name,
          email: booking.staff.email,
        },
        customer: {
          name: booking.customer.name,
          email: booking.customer.email,
          phone: booking.customer.phone,
        },
        workspace: {
          id: booking.workspace.id,
          name: booking.workspace.name,
          slug: booking.workspace.slug,
        },
        googleCalendarUrl: generateGoogleCalendarUrl(calendarEvent),
        outlookCalendarUrl: generateOutlook365Url(calendarEvent),
        icsContent: generateICSContent(calendarEvent),
      },
    };
  } catch (err: any) {
    await logFailure('Error fetching booking by manage token', { err });
    return { success: false, error: 'Could not load appointment details.' };
  }
}

export async function rescheduleBookingByManageTokenAction(
  token: string,
  newDate: string,
  newTime: string
) {
  try {
    if (!token || !newDate || !newTime) {
      return { success: false, error: 'Missing reschedule parameters.' };
    }

    const throttle = await checkRateLimit(await callerKey('manage-booking'), MANAGE_BOOKING_LIMIT);
    if (!throttle.allowed) {
      return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
    }

    const booking = await prisma.booking.findUnique({
      where: { manageToken: token },
      include: {
        workspace: true,
        service: { include: { staffAssignments: { include: { staff: true } } } },
        staff: true,
        participants: { where: { status: { not: 'CANCELLED' } } },
      },
    });

    if (!booking) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (booking.status === 'CANCELLED') {
      return { success: false, error: 'Cannot reschedule a cancelled appointment.' };
    }

    // Collective (panel) bookings involve every required staff member's
    // calendar at once. Re-matching all of them safely through this
    // customer-facing token flow is out of scope here — collective bookings
    // are staff-created, not a self-service path — so ask the customer to go
    // through the business instead of silently moving only the primary slot.
    if (booking.participants.length > 0) {
      return {
        success: false,
        error: 'This appointment involves multiple team members. Please contact us to reschedule.',
      };
    }

    const tz = booking.customerTimezone || booking.workspace.timezone || 'UTC';
    const requestedStart = localTimeToUtc(newDate, newTime, tz);
    if (!requestedStart) {
      return { success: false, error: 'Invalid date or time selected.' };
    }

    // Effective duration with any existing selected add-ons
    const rawAddons = (booking.selectedAddons as Array<{ durationMinutes: number }>) || [];
    const extraDuration = rawAddons.reduce((sum, a) => sum + (Number(a.durationMinutes) || 0), 0);
    const effectiveDuration = (booking.service.durationMinutes || 30) + extraDuration;
    const isGroupService = Boolean(booking.service.capacity && booking.service.capacity > 1);

    // Check staff schedules for the new date
    const candidates = [{ id: booking.staff.id, name: booking.staff.name }];
    const schedules = await loadSchedules(candidates, newDate, tz);

    let matchedSlot: Slot | null = null;
    for (const schedule of schedules) {
      // A group service's own bookings (including this one's current slot)
      // are capacity used, not a scheduling conflict, so they must never
      // block a candidate slot the same way a real double-booking would.
      const blockingBusy = isGroupService
        ? schedule.busy.filter((b) => b.serviceId !== booking.serviceId)
        : schedule.busy.filter((b) => b.start.getTime() !== booking.startTime.getTime());

      const match = generateSlots({
        date: newDate,
        timezone: tz,
        window: schedule.window,
        durationMinutes: effectiveDuration,
        bufferBeforeMinutes: booking.service.bufferBeforeMinutes || 0,
        bufferAfterMinutes: booking.service.bufferAfterMinutes || 0,
        busy: blockingBusy,
      }).find((slot) => slot.startUtc.getTime() === requestedStart.getTime());

      if (match) {
        matchedSlot = match;
        break;
      }
    }

    if (!matchedSlot) {
      return { success: false, error: 'The selected time slot is no longer available.' };
    }

    const previousStartTime = booking.startTime;

    const updated = await prisma.$transaction(async (tx) => {
      if (isGroupService && booking.service.capacity) {
        // Locked per staff+service, not per exact slot — see
        // createBookingWithCapacityAndParticipants for why exact-start
        // locking/counting misses overlaps caused by add-on duration.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${booking.staffId}), hashtext(${booking.serviceId}))`;

        const used = await tx.booking.count({
          where: {
            staffId: booking.staffId,
            serviceId: booking.serviceId,
            status: { not: 'CANCELLED' },
            id: { not: booking.id },
            startTime: { lt: matchedSlot.endUtc },
            endTime: { gt: matchedSlot.startUtc },
          },
        });
        if (used >= booking.service.capacity) {
          throw new BookingCapacityExceededError();
        }
      }

      return tx.booking.update({
        where: { id: booking.id },
        data: {
          startTime: matchedSlot.startUtc,
          endTime: matchedSlot.endUtc,
          auditLogs: {
            create: {
              action: 'RESCHEDULED',
              actorType: 'CUSTOMER',
              details: {
                previousStartTime: previousStartTime.toISOString(),
                newStartTime: matchedSlot.startUtc.toISOString(),
                rescheduledAt: new Date().toISOString(),
              },
            },
          },
        },
      });
    });

    // Reminders already recorded refer to the old slot. The delivery claim has
    // no time component, so leaving them would block any reminder for the new
    // time from ever being sent.
    await clearScheduledNotifications(updated.id).catch(
      (e) => void logFailure('Could not clear reminders for the previous slot', { err: e })
    );

    // Notify of reschedule
    await dispatchBookingNotifications(updated.id, 'BOOKING_RESCHEDULED').catch(
      (e) => void logFailure('Notification failed', { err: e })
    );

    // Trigger waitlist recovery for the vacated slot
    await triggerWaitlistRecovery(booking.id, previousStartTime).catch(
      (e) => void logFailure('Waitlist recovery check failed', { err: e })
    );

    revalidatePath('/calendar');
    revalidatePath('/appointments');

    return {
      success: true,
      message: 'Appointment rescheduled successfully.',
      formattedDate: formatTz(toZonedTime(matchedSlot.startUtc, tz), 'EEEE, MMMM d, yyyy', {
        timeZone: tz,
      }),
      formattedTime: `${formatTz(toZonedTime(matchedSlot.startUtc, tz), 'h:mm a', { timeZone: tz })} - ${formatTz(toZonedTime(matchedSlot.endUtc, tz), 'h:mm a', { timeZone: tz })}`,
    };
  } catch (err: any) {
    if (err instanceof BookingCapacityExceededError) {
      return {
        success: false,
        error: 'That session just reached capacity. Please choose another slot.',
      };
    }
    if (isOverlapConstraintViolation(err)) {
      return { success: false, error: 'That slot was just booked by someone else.' };
    }
    await logFailure('Error rescheduling booking', { err });
    return { success: false, error: 'Failed to reschedule appointment. Please try again.' };
  }
}

export async function cancelBookingByManageTokenAction(token: string, reason?: string) {
  try {
    if (!token) {
      return { success: false, error: 'Manage token is required.' };
    }

    const throttle = await checkRateLimit(await callerKey('manage-booking'), MANAGE_BOOKING_LIMIT);
    if (!throttle.allowed) {
      return { success: false, error: 'Too many requests. Please wait a moment and try again.' };
    }

    const booking = await prisma.booking.findUnique({
      where: { manageToken: token },
    });

    if (!booking) {
      return { success: false, error: 'Appointment not found.' };
    }

    if (booking.status === 'CANCELLED') {
      return { success: true, message: 'Appointment was already cancelled.' };
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CANCELLED',
          cancellationReason: reason?.trim() || 'Cancelled by customer via self-service portal',
          auditLogs: {
            create: {
              action: 'CANCELLED',
              actorType: 'CUSTOMER',
              details: {
                reason: reason?.trim() || null,
                cancelledAt: new Date().toISOString(),
              },
            },
          },
        },
      }),
      // A collective booking's participant rows sit under their own
      // exclusion constraint. Leaving them CONFIRMED after the booking they
      // belong to is cancelled would permanently block those staff members'
      // calendars at this slot.
      prisma.bookingParticipant.updateMany({
        where: { bookingId: booking.id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      }),
    ]);

    // Dispatch cancellation notifications
    await dispatchBookingNotifications(booking.id, 'BOOKING_CANCELLED').catch(
      (e) => void logFailure('Cancel notification error', { err: e })
    );

    // Immediately trigger priority waitlist recovery!
    await triggerWaitlistRecovery(booking.id).catch(
      (e) => void logFailure('Waitlist recovery error on cancel', { err: e })
    );

    revalidatePath('/calendar');
    revalidatePath('/appointments');

    return { success: true, message: 'Your appointment has been cancelled.' };
  } catch (err: any) {
    await logFailure('Error cancelling booking', { err });
    return { success: false, error: 'Failed to cancel appointment. Please try again.' };
  }
}

export interface VerifyAndConfirmPaymentInput {
  bookingId: string;
  provider: PaymentProvider;
  orderId: string;
  transactionId?: string;
  signature?: string;
  paymentToken?: string;
}

/**
 * Verify payment signature/token and transition pending booking to CONFIRMED.
 */
export async function verifyAndConfirmPaymentAction(
  input: VerifyAndConfirmPaymentInput
): Promise<BookingResult> {
  try {
    const { bookingId, orderId } = input;
    if (!bookingId || !orderId) {
      return { success: false, error: 'Missing booking or order identifier.' };
    }

    // Each call verifies against the real gateway API, so this bounds both
    // scripted hammering of this action and unnecessary gateway load.
    const throttle = await checkRateLimit(await callerKey('payment-verify'), PAYMENT_VERIFY_LIMIT);
    if (!throttle.allowed) {
      return { success: false, error: 'Too many attempts. Please wait a moment and try again.' };
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        workspace: true,
        service: true,
        staff: true,
        customer: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking record not found.' };
    }

    const timezone = booking.workspace.timezone || 'UTC';
    const manageUrl = `/book/manage/${booking.manageToken}`;

    // If already confirmed (e.g. duplicate callback or webhook finished first).
    // bookingId alone isn't a secret: it rides in plain in the Stripe redirect
    // URL, so it can end up in browser history or referrer headers. Requiring
    // the order id to still match, exactly as the not-yet-confirmed branch
    // below does, stops anyone who obtains a bookingId from pulling the
    // customer's PII by calling this action with any order id.
    if (
      booking.status === 'CONFIRMED' &&
      booking.paymentStatus === 'PAID' &&
      booking.paymentOrderId === orderId
    ) {
      const calendarEvent = {
        title: `${booking.service.name} with ${booking.staff.name}`,
        description: `Appointment for ${booking.service.name} at ${booking.workspace.name}.\n${booking.meetingLink ? `Video Meeting Link: ${booking.meetingLink}\n` : ''}Client: ${booking.customer.name}`,
        location:
          booking.meetingLink || (booking.service.locationDetails ?? booking.workspace.name),
        startTime: booking.startTime,
        endTime: booking.endTime,
        organizerName: booking.workspace.name,
        uid: booking.id,
      };

      return {
        success: true,
        requiresPayment: false,
        bookingId: booking.id,
        manageToken: booking.manageToken ?? undefined,
        manageUrl,
        meetingLink: booking.meetingLink ?? undefined,
        startTime: formatTz(
          toZonedTime(booking.startTime, timezone),
          'EEEE, MMMM d, yyyy - h:mm a',
          {
            timeZone: timezone,
          }
        ),
        endTime: formatTz(toZonedTime(booking.endTime, timezone), 'h:mm a', {
          timeZone: timezone,
        }),
        serviceName: booking.service.name,
        staffName: booking.staff.name,
        paidPrice: Number(booking.paidPrice || 0),
        currency: booking.paymentCurrency || 'USD',
        selectedAddons: (booking.selectedAddons as any[]) || [],
        intakeResponses: (booking.intakeResponses as any) || undefined,
        googleCalendarUrl: generateGoogleCalendarUrl(calendarEvent),
        outlookCalendarUrl: generateOutlook365Url(calendarEvent),
        icsContent: generateICSContent(calendarEvent),
      };
    }

    // The provider and order id are resolved and stored server-side when the
    // payment order is created (createPaymentOrder, above). Trusting the
    // client-supplied `provider` instead would let a caller pick whichever
    // provider has no credentials configured, since every verifier reports
    // success when it cannot reach a real gateway. Re-deriving both from the
    // booking record closes that hole; a mismatched or missing order id means
    // this isn't the order that was actually issued for this booking.
    if (!booking.paymentProvider || !booking.paymentOrderId) {
      return { success: false, error: 'No payment order is associated with this booking.' };
    }
    if (booking.paymentOrderId !== orderId) {
      return { success: false, error: 'This order does not match the pending booking.' };
    }
    const provider = booking.paymentProvider as PaymentProvider;

    // Verify payment with gateway verifier
    const verifyRes = await verifyPayment({
      bookingId,
      provider,
      orderId,
      transactionId: input.transactionId,
      signature: input.signature,
      paymentToken: input.paymentToken,
    });

    if (!verifyRes.success) {
      return {
        success: false,
        error: verifyRes.error || 'Payment verification failed. Please try again.',
      };
    }

    const meetingLink =
      booking.service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null;

    // Guarded on the booking still being PENDING: without this, replaying a
    // valid payment signature (the original webhook redelivered, or a stale
    // browser tab resubmitting) can flip a booking back to CONFIRMED/PAID
    // after it was cancelled in between — resurrecting a booking whose
    // capacity seat or collective participant rows were already released.
    const updateResult = await prisma.booking.updateMany({
      where: { id: bookingId, status: 'PENDING', paymentOrderId: orderId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentTransactionId: verifyRes.transactionId,
        paymentProvider: provider,
        paidAt: new Date(),
        meetingLink,
      },
    });

    if (updateResult.count === 0) {
      return {
        success: false,
        error: 'This booking is no longer pending confirmation.',
      };
    }

    await prisma.bookingAuditLog.create({
      data: {
        bookingId,
        action: 'PAYMENT_VERIFIED_CONFIRMED',
        actorType: 'CUSTOMER',
        actorId: booking.customerId,
        details: {
          transactionId: verifyRes.transactionId,
          orderId,
          provider,
          paidPrice: booking.paidPrice,
          confirmedAt: new Date().toISOString(),
        },
      },
    });

    // Dispatch confirmation notifications
    await dispatchBookingNotifications(bookingId, 'BOOKING_CREATED').catch(
      (err) => void logFailure('Booking notification dispatch failed after payment', { err })
    );

    revalidatePath('/calendar');
    revalidatePath('/appointments');
    revalidatePath('/customers');

    const calendarEvent = {
      title: `${booking.service.name} with ${booking.staff.name}`,
      description: `Appointment for ${booking.service.name} at ${booking.workspace.name}.\n${meetingLink ? `Video Meeting Link: ${meetingLink}\n` : ''}Client: ${booking.customer.name}`,
      location: meetingLink || (booking.service.locationDetails ?? booking.workspace.name),
      startTime: booking.startTime,
      endTime: booking.endTime,
      organizerName: booking.workspace.name,
      uid: booking.id,
    };

    return {
      success: true,
      requiresPayment: false,
      bookingId: booking.id,
      manageToken: booking.manageToken ?? undefined,
      manageUrl,
      meetingLink: meetingLink ?? undefined,
      startTime: formatTz(toZonedTime(booking.startTime, timezone), 'EEEE, MMMM d, yyyy - h:mm a', {
        timeZone: timezone,
      }),
      endTime: formatTz(toZonedTime(booking.endTime, timezone), 'h:mm a', {
        timeZone: timezone,
      }),
      serviceName: booking.service.name,
      staffName: booking.staff.name,
      paidPrice: Number(booking.paidPrice || 0),
      currency: booking.paymentCurrency || 'USD',
      selectedAddons: (booking.selectedAddons as any[]) || [],
      intakeResponses: (booking.intakeResponses as any) || undefined,
      googleCalendarUrl: generateGoogleCalendarUrl(calendarEvent),
      outlookCalendarUrl: generateOutlook365Url(calendarEvent),
      icsContent: generateICSContent(calendarEvent),
    };
  } catch (error: any) {
    await logFailure('Error verifying payment', { err: error });
    return {
      success: false,
      error: 'Payment confirmation encountered an error. Please try again.',
    };
  }
}
