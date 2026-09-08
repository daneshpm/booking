'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { addMinutes, format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';
import { timeStringToMinutes, minutesToTimeString } from '@bookings/core';
import { isOverlapConstraintViolation } from '@/lib/booking-errors';
import { generateMeetingLink } from '@/lib/meeting-link';
import { dispatchBookingNotifications } from '@/lib/notifications';

export interface AvailableSlot {
  time: string; // "09:00"
  label: string; // "09:00 AM"
  staffId: string;
  staffName?: string;
}

export interface BookingFormData {
  workspaceId: string;
  serviceId: string;
  staffId?: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (e.g. "10:00")
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerNotes?: string;
  customerTimezone?: string;
  /**
   * Optional client-supplied key. Re-submitting the same key returns the
   * original booking instead of creating a duplicate, which protects against
   * a double-clicked confirm button or an automatically retried request.
   */
  idempotencyKey?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  meetingLink?: string;
  startTime?: string;
  endTime?: string;
  serviceName?: string;
  staffName?: string;
  error?: string;
}

/**
 * Calculates dynamic available appointment slots for a service on a given date,
 * considering staff weekly hours, lunch breaks, specific date overrides/leaves,
 * existing confirmed bookings, and pre/post buffer intervals.
 */
export async function getAvailableSlotsAction(
  workspaceId: string,
  serviceId: string,
  date: string, // YYYY-MM-DD
  preferredStaffId?: string
): Promise<{ success: boolean; slots: AvailableSlot[]; error?: string }> {
  try {
    if (!workspaceId || !serviceId || !date) {
      return { success: false, slots: [], error: 'Missing required parameters.' };
    }

    // 1. Fetch workspace to determine timezone
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return { success: false, slots: [], error: 'Workspace not found.' };
    }

    const timezone = workspace.timezone || 'UTC';

    // 2. Fetch service details, scoped to the workspace so an id belonging to
    //    another tenant cannot resolve.
    const service = await prisma.service.findFirst({
      where: { id: serviceId, workspaceId },
      include: {
        staffAssignments: {
          include: { staff: true },
        },
      },
    });

    if (!service || !service.isActive) {
      return { success: false, slots: [], error: 'Service not found or is currently inactive.' };
    }

    const durationMinutes = service.durationMinutes || 30;
    const bufferBefore = service.bufferBeforeMinutes || 0;
    const bufferAfter = service.bufferAfterMinutes || 0;
    // Step intervals: default to 30 mins or service duration if shorter
    const slotStep = Math.min(30, durationMinutes);

    // 3. Determine candidate staff members
    let candidateStaff: Array<{ id: string; name: string; timezone: string }> = [];

    if (preferredStaffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: preferredStaffId, workspaceId, isActive: true },
      });
      if (staff) candidateStaff = [staff];
    } else if (service.staffAssignments && service.staffAssignments.length > 0) {
      candidateStaff = service.staffAssignments
        .map((assignment) => assignment.staff)
        .filter((staff) => staff.isActive);
    } else {
      candidateStaff = await prisma.staff.findMany({
        where: { workspaceId, isActive: true },
      });
    }

    if (candidateStaff.length === 0) {
      return { success: true, slots: [] };
    }

    // Determine day of the week (0 = Sunday, 1 = Monday ... 6 = Saturday)
    const localDateSample = new Date(`${date}T12:00:00`);
    const dayOfWeek = localDateSample.getDay();

    const dayStartUtc = fromZonedTime(`${date}T00:00:00`, timezone);
    const dayEndUtc = fromZonedTime(`${date}T23:59:59.999`, timezone);

    const targetDateObj = new Date(`${date}T00:00:00.000Z`);
    const nextDayObj = new Date(targetDateObj.getTime() + 24 * 60 * 60 * 1000);

    const slotMap = new Map<string, AvailableSlot>();

    // 4. Evaluate availability for each candidate staff member
    for (const staff of candidateStaff) {
      // Check for date override / leave
      const override = await prisma.staffOverride.findFirst({
        where: {
          staffId: staff.id,
          date: {
            gte: targetDateObj,
            lt: nextDayObj,
          },
        },
      });

      let workStartStr: string | null = null;
      let workEndStr: string | null = null;
      let breaks: Array<{ startTime: string; endTime: string }> = [];

      if (override) {
        if (!override.isWorking) {
          // Staff is taking leave / holiday on this date
          continue;
        }
        if (override.startTime && override.endTime) {
          workStartStr = override.startTime;
          workEndStr = override.endTime;
        }
      } else {
        // Query weekly working schedule
        const workingHours = await prisma.staffWorkingHours.findUnique({
          where: {
            staffId_dayOfWeek: {
              staffId: staff.id,
              dayOfWeek,
            },
          },
          include: {
            breaks: true,
          },
        });

        if (!workingHours) {
          // Staff does not work on this day of week
          continue;
        }

        workStartStr = workingHours.startTime;
        workEndStr = workingHours.endTime;
        breaks = workingHours.breaks;
      }

      if (!workStartStr || !workEndStr) {
        continue;
      }

      const shiftStartMinutes = timeStringToMinutes(workStartStr);
      const shiftEndMinutes = timeStringToMinutes(workEndStr);

      const parsedBreaks = breaks.map((b) => ({
        start: timeStringToMinutes(b.startTime),
        end: timeStringToMinutes(b.endTime),
      }));

      // Fetch confirmed bookings for this staff on this date
      const existingBookings = await prisma.booking.findMany({
        where: {
          staffId: staff.id,
          status: { notIn: ['CANCELLED'] },
          startTime: { lt: dayEndUtc },
          endTime: { gt: dayStartUtc },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      });

      const busyIntervals = existingBookings.map((b) => {
        const localStart = toZonedTime(b.startTime, timezone);
        const localEnd = toZonedTime(b.endTime, timezone);
        return {
          start: localStart.getHours() * 60 + localStart.getMinutes(),
          end: localEnd.getHours() * 60 + localEnd.getMinutes(),
        };
      });

      // Slide across the shift to generate available slots
      let currentMinutes = shiftStartMinutes;
      const now = Date.now();

      while (currentMinutes + durationMinutes <= shiftEndMinutes) {
        const slotStart = currentMinutes;
        const slotEnd = currentMinutes + durationMinutes;

        // Apply service buffers
        const bufferedStart = slotStart - bufferBefore;
        const bufferedEnd = slotEnd + bufferAfter;

        // Check if overlaps with any break
        const collidesWithBreak = parsedBreaks.some(
          (b) => bufferedStart < b.end && bufferedEnd > b.start
        );

        // Check if overlaps with any existing booking
        const collidesWithBooking = busyIntervals.some(
          (b) => bufferedStart < b.end && bufferedEnd > b.start
        );

        // Check if slot timestamp is in the past (must be at least 10 minutes in the future)
        const slotTimeStr = minutesToTimeString(slotStart);
        const slotUtc = fromZonedTime(`${date}T${slotTimeStr}:00`, timezone);
        const isPast = slotUtc.getTime() <= now + 10 * 60 * 1000;

        if (!collidesWithBreak && !collidesWithBooking && !isPast) {
          if (!slotMap.has(slotTimeStr)) {
            const hours = Math.floor(slotStart / 60);
            const mins = slotStart % 60;
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 === 0 ? 12 : hours % 12;
            const label = `${String(displayHours).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;

            slotMap.set(slotTimeStr, {
              time: slotTimeStr,
              label,
              staffId: staff.id,
              staffName: staff.name,
            });
          }
        }

        currentMinutes += slotStep;
      }
    }

    // Sort slots chronologically
    const slots = Array.from(slotMap.values()).sort((a, b) =>
      a.time.localeCompare(b.time)
    );

    return {
      success: true,
      slots,
    };
  } catch (error) {
    console.error('Error calculating available slots:', error);
    return {
      success: false,
      slots: [],
      error: error instanceof Error ? error.message : 'Failed to calculate available slots.',
    };
  }
}

/**
 * Create a booking from the public booking page.
 *
 * This endpoint is intentionally unauthenticated, so every identifier it
 * receives is treated as untrusted: the service and staff member are resolved
 * scoped to the workspace, and the appointment window is recomputed on the
 * server from the service duration rather than taken from the request.
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
    if (!EMAIL_PATTERN.test(customerEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (customerName.length > 200) {
      return { success: false, error: 'Please enter a shorter name.' };
    }

    // An earlier submission carrying the same key already produced a booking.
    if (data.idempotencyKey) {
      const existing = await prisma.booking.findUnique({
        where: { idempotencyKey: data.idempotencyKey },
        include: { service: true, staff: true, workspace: true },
      });
      if (existing) {
        const tz = existing.workspace.timezone || 'UTC';
        return {
          success: true,
          bookingId: existing.id,
          meetingLink: existing.meetingLink ?? undefined,
          startTime: formatTz(
            toZonedTime(existing.startTime, tz),
            'EEEE, MMMM d, yyyy - h:mm a',
            { timeZone: tz }
          ),
          endTime: formatTz(toZonedTime(existing.endTime, tz), 'h:mm a', { timeZone: tz }),
          serviceName: existing.service.name,
          staffName: existing.staff.name,
        };
      }
    }

    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) {
      return { success: false, error: 'Workspace not found.' };
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

    // Candidate staff: the requested member when they are assigned and active,
    // otherwise the service's assigned staff, otherwise anyone active.
    const assigned = service.staffAssignments.map((a) => a.staff).filter((s) => s.isActive);
    let candidates = assigned;

    if (data.staffId) {
      const requested = assigned.find((s) => s.id === data.staffId);
      if (!requested) {
        return {
          success: false,
          error: 'The selected staff member is not available for this service.',
        };
      }
      candidates = [requested];
    } else if (candidates.length === 0) {
      candidates = await prisma.staff.findMany({
        where: { workspaceId, isActive: true },
        orderBy: { name: 'asc' },
      });
    }

    if (candidates.length === 0) {
      return { success: false, error: 'No staff are available for this service.' };
    }

    const timezone = workspace.timezone || 'UTC';
    const startUtc = fromZonedTime(`${date}T${time}:00`, timezone);
    if (Number.isNaN(startUtc.getTime())) {
      return { success: false, error: 'Please choose a valid date and time.' };
    }
    const endUtc = addMinutes(startUtc, service.durationMinutes);

    if (startUtc.getTime() <= Date.now()) {
      return { success: false, error: 'That time has already passed. Please choose another slot.' };
    }

    // Pick the first candidate with no overlapping appointment. The database
    // exclusion constraint is the real guarantee; this only chooses who to book.
    let chosenStaff: { id: string; name: string; email: string } | null = null;
    for (const candidate of candidates) {
      const clash = await prisma.booking.findFirst({
        where: {
          staffId: candidate.id,
          status: { notIn: ['CANCELLED'] },
          AND: [{ startTime: { lt: endUtc } }, { endTime: { gt: startUtc } }],
        },
        select: { id: true },
      });
      if (!clash) {
        chosenStaff = candidate;
        break;
      }
    }

    if (!chosenStaff) {
      return {
        success: false,
        error: 'This time slot was just booked. Please select another slot.',
      };
    }

    const customer = await prisma.customer.upsert({
      where: { workspaceId_email: { workspaceId, email: customerEmail } },
      update: {
        name: customerName,
        phone: data.customerPhone?.trim() || undefined,
        notes: data.customerNotes?.trim() || undefined,
      },
      create: {
        workspaceId,
        name: customerName,
        email: customerEmail,
        phone: data.customerPhone?.trim() || undefined,
        notes: data.customerNotes?.trim() || undefined,
      },
    });

    // meetingLink holds a URL, so a non-online service leaves it null and the
    // service's own location details are shown to the customer instead.
    const meetingLink = service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null;

    const booking = await prisma.booking.create({
      data: {
        workspaceId,
        serviceId: service.id,
        staffId: chosenStaff.id,
        customerId: customer.id,
        startTime: startUtc,
        endTime: endUtc,
        customerTimezone: data.customerTimezone || timezone,
        status: 'CONFIRMED',
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
            },
          },
        },
      },
    });

    // A failed email must not undo a booking the customer already completed.
    await dispatchBookingNotifications(booking.id, 'BOOKING_CREATED').catch((err) =>
      console.error('Booking notification dispatch failed:', err)
    );

    revalidatePath('/calendar');
    revalidatePath('/appointments');
    revalidatePath('/customers');

    return {
      success: true,
      bookingId: booking.id,
      meetingLink: meetingLink ?? undefined,
      startTime: formatTz(toZonedTime(startUtc, timezone), 'EEEE, MMMM d, yyyy - h:mm a', {
        timeZone: timezone,
      }),
      endTime: formatTz(toZonedTime(endUtc, timezone), 'h:mm a', { timeZone: timezone }),
      serviceName: service.name,
      staffName: chosenStaff.name,
    };
  } catch (error) {
    if (isOverlapConstraintViolation(error)) {
      return {
        success: false,
        error: 'This time slot was just booked. Please select another slot.',
      };
    }
    // The raw message can carry query or schema detail, so it is logged rather
    // than returned to the browser.
    console.error('Error creating booking:', error);
    return { success: false, error: 'We could not complete your booking. Please try again.' };
  }
}
