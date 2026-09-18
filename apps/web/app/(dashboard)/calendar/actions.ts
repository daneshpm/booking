'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BookingStatus } from '@bookings/database';
import { addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';
import { requireWorkspace, toActionError } from '@/lib/session';
import { isOverlapConstraintViolation, BookingCapacityExceededError } from '@/lib/booking-errors';
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
    include: {
      workspace: true,
      service: true,
      participants: { where: { status: { not: 'CANCELLED' } } },
    },
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

    // A cancelled booking's held seat (for a group service) or participant
    // rows (for a collective one) are released the moment it is cancelled and
    // nothing re-validates or restores them, so silently un-cancelling could
    // resurrect a booking whose slot was already resold or whose panel was
    // already dissolved. A fresh booking is the safe way back in.
    if (booking.status === 'CANCELLED' && status !== 'CANCELLED') {
      return {
        success: false,
        error: 'A cancelled appointment cannot be restored. Please create a new booking instead.',
      };
    }

    await prisma.$transaction([
      prisma.booking.update({
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
      }),
      // A cancelled booking's participant rows must not keep blocking those
      // staff members' calendars under their own exclusion constraint.
      ...(status === 'CANCELLED'
        ? [
            prisma.bookingParticipant.updateMany({
              where: { bookingId, status: { not: 'CANCELLED' } },
              data: { status: 'CANCELLED' },
            }),
          ]
        : []),
    ]);

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
    // Add-ons extend the appointment beyond the service's base duration, the
    // same way booking creation and the customer-facing reschedule already
    // account for them — omitting this here would silently shorten a booking
    // that has add-ons and free time that was actually sold.
    const rawAddons = (booking.selectedAddons as Array<{ durationMinutes: number }>) || [];
    const extraDuration = rawAddons.reduce((sum, a) => sum + (Number(a.durationMinutes) || 0), 0);
    const newEndUtc = addMinutes(newStartUtc, booking.service.durationMinutes + extraDuration);

    if (Number.isNaN(newStartUtc.getTime())) {
      return { success: false, error: 'Please provide a valid date and time.' };
    }

    if (newStartUtc.getTime() < Date.now() - 60000) {
      return {
        success: false,
        error: 'Cannot reschedule an appointment to a past date or time.',
      };
    }

    const isGroupService = Boolean(booking.service.capacity && booking.service.capacity > 1);

    // The database holds an exclusion constraint that rejects overlapping
    // appointments for a staff member, so the write below is the real check.
    // This lookup only turns the common case into a friendlier message. A
    // group service's own other bookings sharing this staff+slot are
    // capacity used, not a conflict, so they are excluded here — capacity is
    // checked separately, below, inside the transaction.
    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: bookingId },
        staffId: booking.staffId,
        status: { notIn: ['CANCELLED'] },
        ...(isGroupService ? { serviceId: { not: booking.serviceId } } : {}),
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

    // A collective (panel) booking's other required staff must also be free
    // at the new time, and their participant rows have to move in step with
    // the primary booking's or they are left blocking that slot forever.
    for (const participant of booking.participants) {
      const participantConflict = await prisma.booking.findFirst({
        where: {
          staffId: participant.staffId,
          status: { notIn: ['CANCELLED'] },
          AND: [{ startTime: { lt: newEndUtc } }, { endTime: { gt: newStartUtc } }],
        },
        select: { id: true },
      });
      const participantSelfConflict = await prisma.bookingParticipant.findFirst({
        where: {
          id: { not: participant.id },
          staffId: participant.staffId,
          status: { not: 'CANCELLED' },
          AND: [{ startTime: { lt: newEndUtc } }, { endTime: { gt: newStartUtc } }],
        },
        select: { id: true },
      });
      if (participantConflict || participantSelfConflict) {
        return {
          success: false,
          error: 'A required team member is not available at the requested new time.',
        };
      }
    }

    await prisma.$transaction(async (tx) => {
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
            id: { not: bookingId },
            startTime: { lt: newEndUtc },
            endTime: { gt: newStartUtc },
          },
        });
        if (used >= booking.service.capacity) {
          throw new BookingCapacityExceededError();
        }
      }

      await tx.booking.update({
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

      for (const participant of booking.participants) {
        await tx.bookingParticipant.update({
          where: { id: participant.id },
          data: { startTime: newStartUtc, endTime: newEndUtc },
        });
      }
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
    if (error instanceof BookingCapacityExceededError) {
      return {
        success: false,
        error: 'That session is already at capacity for the requested time.',
      };
    }
    if (isOverlapConstraintViolation(error)) {
      return {
        success: false,
        error: 'That time slot was just taken. Please choose another.',
      };
    }
    return toActionError(error);
  }
}
