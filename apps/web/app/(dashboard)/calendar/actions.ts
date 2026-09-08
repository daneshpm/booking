'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BookingStatus } from '@bookings/database';
import { addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { requireWorkspace, toActionError } from '@/lib/session';
import { isOverlapConstraintViolation } from '@/lib/booking-errors';
import { dispatchBookingNotifications, clearScheduledNotifications } from '@/lib/notifications';

/**
 * Statuses a dashboard user may set.
 *
 * TypeScript types are erased at the server-action boundary, so the value
 * arriving here is whatever the caller sent.
 */
const ALLOWED_STATUSES: readonly BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
];

export interface BookingActionResult {
  success: boolean;
  error?: string;
}

/**
 * Load a booking only if the signed-in caller belongs to its workspace.
 *
 * A booking id arriving from the browser is attacker-controlled, so the row is
 * fetched first and its workspace is then checked against the session. An id
 * from another tenant is reported as "not found", which avoids confirming that
 * the id exists.
 */
async function loadOwnedBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { workspace: true, service: true },
  });

  if (!booking) return null;

  try {
    await requireWorkspace(booking.workspaceId, 'STAFF');
  } catch {
    return null;
  }

  return booking;
}

export async function updateBookingStatusAction(
  bookingId: string,
  status: BookingStatus
): Promise<BookingActionResult> {
  try {
    if (!ALLOWED_STATUSES.includes(status)) {
      return { success: false, error: 'That is not a valid appointment status.' };
    }

    const booking = await loadOwnedBooking(bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        auditLogs: {
          create: {
            action: 'STATUS_CHANGE',
            actorType: 'STAFF',
            details: {
              previousStatus: booking.status,
              newStatus: status,
              updatedAt: new Date().toISOString(),
            },
          },
        },
      },
    });

    // Cancelling from the calendar must tell the customer, exactly as
    // cancelling from the appointments page does.
    if (status === 'CANCELLED') {
      await dispatchBookingNotifications(bookingId, 'BOOKING_CANCELLED').catch((err) =>
        console.error('Cancellation notification dispatch failed:', err)
      );
    }

    revalidatePath('/calendar');
    revalidatePath('/appointments');
    revalidatePath('/customers');

    return { success: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function rescheduleBookingAction(
  bookingId: string,
  newDate: string, // YYYY-MM-DD
  newTime: string // HH:mm
): Promise<BookingActionResult> {
  try {
    const booking = await loadOwnedBooking(bookingId);
    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(newDate) || !/^\d{2}:\d{2}$/.test(newTime)) {
      return { success: false, error: 'Please provide a valid date and time.' };
    }

    const timezone = booking.workspace.timezone || 'UTC';
    const newStartUtc = fromZonedTime(`${newDate}T${newTime}:00`, timezone);
    const newEndUtc = addMinutes(newStartUtc, booking.service.durationMinutes);

    if (Number.isNaN(newStartUtc.getTime())) {
      return { success: false, error: 'Please provide a valid date and time.' };
    }

    // The database holds an exclusion constraint that rejects overlapping
    // appointments for a staff member, so the write below is the real check.
    // This lookup only turns the common case into a friendlier message.
    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: bookingId },
        staffId: booking.staffId,
        status: { notIn: ['CANCELLED'] },
        AND: [{ startTime: { lt: newEndUtc } }, { endTime: { gt: newStartUtc } }],
      },
      select: { id: true },
    });

    if (conflict) {
      return {
        success: false,
        error: 'The requested new time slot conflicts with an existing booking.',
      };
    }

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        startTime: newStartUtc,
        endTime: newEndUtc,
        status: 'RESCHEDULED',
        auditLogs: {
          create: {
            action: 'RESCHEDULED',
            actorType: 'STAFF',
            details: {
              previousStart: booking.startTime.toISOString(),
              previousEnd: booking.endTime.toISOString(),
              newStart: newStartUtc.toISOString(),
              newEnd: newEndUtc.toISOString(),
              rescheduledAt: new Date().toISOString(),
            },
          },
        },
      },
    });

    // Reminders already recorded refer to the old slot. The delivery claim has
    // no time component, so leaving them would block any reminder for the new
    // time from ever being sent.
    await clearScheduledNotifications(bookingId).catch((err) =>
      console.error('Could not clear reminders for the previous slot:', err)
    );

    // The customer is holding a time that just moved, so they are told.
    await dispatchBookingNotifications(bookingId, 'BOOKING_RESCHEDULED').catch((err) =>
      console.error('Reschedule notification dispatch failed:', err)
    );

    revalidatePath('/calendar');
    revalidatePath('/appointments');
    return { success: true };
  } catch (error) {
    if (isOverlapConstraintViolation(error)) {
      return {
        success: false,
        error: 'That time slot was just taken. Please choose another.',
      };
    }
    return toActionError(error);
  }
}
