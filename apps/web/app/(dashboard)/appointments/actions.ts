'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BookingStatus } from '@bookings/database';
import { addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { requireWorkspace, toActionError } from '@/lib/session';
import { isOverlapConstraintViolation } from '@/lib/booking-errors';
import { generateMeetingLink } from '@/lib/meeting-link';
import { dispatchBookingNotifications } from '@/lib/notifications';

export interface CreateAppointmentInput {
  workspaceId: string;
  serviceId: string;
  staffId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
}

export interface AppointmentActionResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createDashboardAppointmentAction(
  data: CreateAppointmentInput
): Promise<AppointmentActionResult> {
  try {
    const { workspaceId, serviceId, staffId, date, time } = data;
    const customerName = data.customerName?.trim() ?? '';
    const customerEmail = data.customerEmail?.toLowerCase().trim() ?? '';

    if (!workspaceId || !serviceId || !staffId || !date || !time || !customerName || !customerEmail) {
      return { success: false, error: 'Please fill in all required fields.' };
    }
    if (!DATE_PATTERN.test(date) || !TIME_PATTERN.test(time)) {
      return { success: false, error: 'Please provide a valid date and time.' };
    }
    if (!EMAIL_PATTERN.test(customerEmail)) {
      return { success: false, error: 'Please provide a valid customer email address.' };
    }

    // Confirms the caller belongs to this workspace before anything is written.
    await requireWorkspace(workspaceId, 'STAFF');

    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });

    // Service and staff are looked up scoped to the workspace. An unscoped
    // lookup would let one tenant's service or staff member be attached to
    // another tenant's booking.
    const [service, staff] = await Promise.all([
      prisma.service.findFirst({ where: { id: serviceId, workspaceId, isActive: true } }),
      prisma.staff.findFirst({ where: { id: staffId, workspaceId, isActive: true } }),
    ]);

    if (!service) return { success: false, error: 'Service not found in this workspace.' };
    if (!staff) return { success: false, error: 'Staff member not found in this workspace.' };

    const timezone = workspace.timezone || 'UTC';
    const startUtc = fromZonedTime(`${date}T${time}:00`, timezone);
    if (Number.isNaN(startUtc.getTime())) {
      return { success: false, error: 'Please provide a valid date and time.' };
    }
    const endUtc = addMinutes(startUtc, service.durationMinutes);

    const conflict = await prisma.booking.findFirst({
      where: {
        staffId,
        status: { notIn: ['CANCELLED'] },
        AND: [{ startTime: { lt: endUtc } }, { endTime: { gt: startUtc } }],
      },
      select: { startTime: true, endTime: true },
    });

    if (conflict) {
      // Rendered in the workspace timezone. Formatting with the server default
      // would show a time that means nothing to the person reading it.
      const from = formatInTimeZone(conflict.startTime, timezone, 'h:mm a');
      const to = formatInTimeZone(conflict.endTime, timezone, 'h:mm a');
      return {
        success: false,
        error: `${staff.name} is already booked between ${from} and ${to}.`,
      };
    }

    const customer = await prisma.customer.upsert({
      where: { workspaceId_email: { workspaceId, email: customerEmail } },
      update: {
        name: customerName,
        phone: data.customerPhone?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
      create: {
        workspaceId,
        name: customerName,
        email: customerEmail,
        phone: data.customerPhone?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        workspaceId,
        serviceId,
        staffId,
        customerId: customer.id,
        startTime: startUtc,
        endTime: endUtc,
        customerTimezone: timezone,
        status: 'CONFIRMED',
        meetingLink:
          service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null,
        auditLogs: {
          create: {
            action: 'CREATED',
            actorType: 'STAFF',
            details: {
              customerEmail: customer.email,
              serviceName: service.name,
              staffName: staff.name,
              createdVia: 'DASHBOARD',
              createdAt: new Date().toISOString(),
            },
          },
        },
      },
    });

    // Notifications must never fail the booking that already committed.
    await dispatchBookingNotifications(booking.id, 'BOOKING_CREATED').catch((err) =>
      console.error('Booking notification dispatch failed:', err)
    );

    revalidatePath('/appointments');
    revalidatePath('/calendar');
    revalidatePath('/customers');

    return { success: true, bookingId: booking.id };
  } catch (err) {
    if (isOverlapConstraintViolation(err)) {
      return {
        success: false,
        error: 'That time slot was just taken. Please choose another.',
      };
    }
    return toActionError(err);
  }
}

export async function updateAppointmentStatusAction(
  bookingId: string,
  status: BookingStatus
): Promise<AppointmentActionResult> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, workspaceId: true, status: true },
    });

    if (!booking) {
      return { success: false, error: 'Appointment not found.' };
    }

    // Reported as "not found" rather than "forbidden" so the response does not
    // confirm that a booking id from another workspace exists.
    try {
      await requireWorkspace(booking.workspaceId, 'STAFF');
    } catch {
      return { success: false, error: 'Appointment not found.' };
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

    if (status === 'CANCELLED') {
      await dispatchBookingNotifications(bookingId, 'BOOKING_CANCELLED').catch((err) =>
        console.error('Cancellation notification dispatch failed:', err)
      );
    }

    revalidatePath('/appointments');
    revalidatePath('/calendar');
    revalidatePath('/customers');

    return { success: true, bookingId };
  } catch (err) {
    return toActionError(err);
  }
}
