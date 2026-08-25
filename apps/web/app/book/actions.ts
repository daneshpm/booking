'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@zoho-bookings/database';
import { addMinutes, format, parseISO, startOfDay, addDays } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

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
}

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

export async function createPublicBookingAction(
  data: BookingFormData
): Promise<BookingResult> {
  try {
    const {
      workspaceId,
      serviceId,
      date,
      time,
      customerName,
      customerEmail,
      customerPhone,
      customerNotes,
      customerTimezone = 'UTC',
    } = data;

    if (!workspaceId || !serviceId || !date || !time || !customerName || !customerEmail) {
      return { success: false, error: 'Missing required booking fields.' };
    }

    // 1. Fetch Workspace and Service
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return { success: false, error: 'Workspace not found.' };
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        staffAssignments: {
          include: { staff: true },
        },
      },
    });

    if (!service) {
      return { success: false, error: 'Service not found or is no longer available.' };
    }

    // 2. Determine Staff Member
    let targetStaffId = data.staffId;
    if (!targetStaffId && service.staffAssignments.length > 0) {
      targetStaffId = service.staffAssignments[0].staff.id;
    }

    if (!targetStaffId) {
      // Fallback to any active staff in the workspace
      const fallbackStaff = await prisma.staff.findFirst({
        where: { workspaceId, isActive: true },
      });
      if (!fallbackStaff) {
        return { success: false, error: 'No staff available for this service.' };
      }
      targetStaffId = fallbackStaff.id;
    }

    const staffMember = await prisma.staff.findUnique({
      where: { id: targetStaffId },
    });

    // 3. Compute Start and End Timestamps in UTC
    const localDateTimeStr = `${date}T${time}:00`;
    const timezone = workspace.timezone || 'UTC';
    const startUtc = fromZonedTime(localDateTimeStr, timezone);
    const endUtc = addMinutes(startUtc, service.durationMinutes);

    // 4. Upsert Customer Record
    const customer = await prisma.customer.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email: customerEmail.toLowerCase().trim(),
        },
      },
      update: {
        name: customerName.trim(),
        phone: customerPhone ? customerPhone.trim() : undefined,
        notes: customerNotes ? customerNotes.trim() : undefined,
      },
      create: {
        workspaceId,
        name: customerName.trim(),
        email: customerEmail.toLowerCase().trim(),
        phone: customerPhone ? customerPhone.trim() : undefined,
        notes: customerNotes ? customerNotes.trim() : undefined,
      },
    });

    // 5. Generate Meeting Link if Online
    const meetingCode = Math.random().toString(36).substring(2, 6) + '-' +
                        Math.random().toString(36).substring(2, 6) + '-' +
                        Math.random().toString(36).substring(2, 6);
    const meetingLink = service.locationType === 'ONLINE_MEETING'
      ? `https://meet.google.com/${meetingCode}`
      : service.locationDetails || 'In-Person Appointment';

    // 6. Create the Booking Record in PostgreSQL
    const booking = await prisma.booking.create({
      data: {
        workspaceId,
        serviceId: service.id,
        staffId: targetStaffId,
        customerId: customer.id,
        startTime: startUtc,
        endTime: endUtc,
        customerTimezone,
        status: 'CONFIRMED',
        meetingLink,
        idempotencyKey: `book_${workspaceId}_${serviceId}_${customer.id}_${startUtc.getTime()}`,
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

    // Revalidate relevant pages
    revalidatePath('/calendar');
    revalidatePath('/customers');

    return {
      success: true,
      bookingId: booking.id,
      meetingLink,
      startTime: formatTz(toZonedTime(startUtc, timezone), 'EEEE, MMMM d, yyyy • h:mm a', { timeZone: timezone }),
      endTime: formatTz(toZonedTime(endUtc, timezone), 'h:mm a', { timeZone: timezone }),
      serviceName: service.name,
      staffName: staffMember?.name || 'Staff Advisor',
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while booking.',
    };
  }
}
