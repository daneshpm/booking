'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BookingStatus } from '@bookings/database';
import { addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

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

export async function createDashboardAppointmentAction(
  data: CreateAppointmentInput
): Promise<AppointmentActionResult> {
  try {
    const {
      workspaceId,
      serviceId,
      staffId,
      date,
      time,
      customerName,
      customerEmail,
      customerPhone,
      notes,
    } = data;

    if (!workspaceId || !serviceId || !staffId || !date || !time || !customerName || !customerEmail) {
      return { success: false, error: 'Please fill in all required fields.' };
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return { success: false, error: 'Workspace not found.' };
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      return { success: false, error: 'Service not found.' };
    }

    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
    });

    if (!staff) {
      return { success: false, error: 'Staff member not found.' };
    }

    const timezone = workspace.timezone || 'America/New_York';
    const localDateTimeStr = `${date}T${time}:00`;
    const startUtc = fromZonedTime(localDateTimeStr, timezone);
    const endUtc = addMinutes(startUtc, service.durationMinutes);

    // Collision check
    const conflict = await prisma.booking.findFirst({
      where: {
        staffId,
        status: { notIn: ['CANCELLED'] },
        AND: [
          { startTime: { lt: endUtc } },
          { endTime: { gt: startUtc } },
        ],
      },
    });

    if (conflict) {
      return {
        success: false,
        error: `Time conflict detected: Staff member is already booked between ${conflict.startTime.toLocaleTimeString()} and ${conflict.endTime.toLocaleTimeString()}.`,
      };
    }

    // Upsert customer
    const cleanEmail = customerEmail.toLowerCase().trim();
    const customer = await prisma.customer.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email: cleanEmail,
        },
      },
      update: {
        name: customerName.trim(),
        phone: customerPhone?.trim() || undefined,
        notes: notes?.trim() || undefined,
      },
      create: {
        workspaceId,
        name: customerName.trim(),
        email: cleanEmail,
        phone: customerPhone?.trim() || undefined,
        notes: notes?.trim() || undefined,
      },
    });

    // Meeting link
    const code = Math.random().toString(36).substring(2, 6) + '-' +
                 Math.random().toString(36).substring(2, 6) + '-' +
                 Math.random().toString(36).substring(2, 6);
    const meetingLink = `https://meet.google.com/${code}`;

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
        meetingLink,
        idempotencyKey: `dash_${workspaceId}_${staffId}_${startUtc.getTime()}_${Date.now()}`,
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

    try {
      revalidatePath('/appointments');
      revalidatePath('/calendar');
      revalidatePath('/customers');
    } catch {
      // Ignored outside Next.js request context
    }

    return { success: true, bookingId: booking.id };
  } catch (err: any) {
    console.error('Error creating dashboard appointment:', err);
    return {
      success: false,
      error: err.message || 'Failed to create appointment.',
    };
  }
}

export async function updateAppointmentStatusAction(
  bookingId: string,
  status: BookingStatus
): Promise<AppointmentActionResult> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
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

    try {
      revalidatePath('/appointments');
      revalidatePath('/calendar');
      revalidatePath('/customers');
    } catch {
      // Ignored outside Next.js request context
    }

    return { success: true, bookingId };
  } catch (err: any) {
    console.error('Error updating appointment status:', err);
    return {
      success: false,
      error: err.message || 'Failed to update status.',
    };
  }
}
