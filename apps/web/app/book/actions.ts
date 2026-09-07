'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { addMinutes, format, parseISO } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';
import { timeStringToMinutes, minutesToTimeString } from '@bookings/core';

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

    // 2. Fetch service details
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
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
 * Creates a public booking with double-booking collision checks and customer upsert.
 */
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

    // Double-booking collision check
    const hasConflict = await prisma.booking.findFirst({
      where: {
        staffId: targetStaffId,
        status: { notIn: ['CANCELLED'] },
        AND: [
          { startTime: { lt: endUtc } },
          { endTime: { gt: startUtc } },
        ],
      },
    });

    if (hasConflict) {
      return {
        success: false,
        error: 'This time slot was just booked by another customer. Please select another slot.',
      };
    }

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
    const meetingCode =
      Math.random().toString(36).substring(2, 6) +
      '-' +
      Math.random().toString(36).substring(2, 6) +
      '-' +
      Math.random().toString(36).substring(2, 6);
    const meetingLink =
      service.locationType === 'ONLINE_MEETING'
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
        idempotencyKey: `book_${workspaceId}_${serviceId}_${targetStaffId}_${startUtc.getTime()}`,
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
    try {
      revalidatePath('/calendar');
      revalidatePath('/customers');
    } catch {
      // Safely ignore when called outside Next.js request context
    }

    return {
      success: true,
      bookingId: booking.id,
      meetingLink,
      startTime: formatTz(
        toZonedTime(startUtc, timezone),
        'EEEE, MMMM d, yyyy • h:mm a',
        { timeZone: timezone }
      ),
      endTime: formatTz(toZonedTime(endUtc, timezone), 'h:mm a', {
        timeZone: timezone,
      }),
      serviceName: service.name,
      staffName: staffMember?.name || 'Staff Advisor',
    };
  } catch (error) {
    console.error('Error creating booking:', error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'An unexpected error occurred while booking.',
    };
  }
}
