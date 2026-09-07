'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BookingStatus } from '@bookings/database';
import { addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

export async function updateBookingStatusAction(
  bookingId: string,
  status: BookingStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

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

    try {
      revalidatePath('/calendar');
      revalidatePath('/customers');
    } catch {
      // Safely ignore when called outside Next.js request context
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating booking status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status.',
    };
  }
}

export async function rescheduleBookingAction(
  bookingId: string,
  newDate: string, // YYYY-MM-DD
  newTime: string // HH:mm
): Promise<{ success: boolean; error?: string }> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        workspace: true,
        service: true,
      },
    });

    if (!booking) {
      return { success: false, error: 'Booking not found.' };
    }

    const timezone = booking.workspace.timezone || 'UTC';
    const localDateTimeStr = `${newDate}T${newTime}:00`;
    const newStartUtc = fromZonedTime(localDateTimeStr, timezone);
    const newEndUtc = addMinutes(newStartUtc, booking.service.durationMinutes);

    // Collision check for new slot
    const conflict = await prisma.booking.findFirst({
      where: {
        id: { not: bookingId },
        staffId: booking.staffId,
        status: { notIn: ['CANCELLED'] },
        AND: [
          { startTime: { lt: newEndUtc } },
          { endTime: { gt: newStartUtc } },
        ],
      },
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

    revalidatePath('/calendar');
    return { success: true };
  } catch (error) {
    console.error('Error rescheduling booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reschedule booking.',
    };
  }
}
