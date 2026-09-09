'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BookingStatus } from '@bookings/database';
import { addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { requireWorkspace, toActionError } from '@/lib/session';
import { isOverlapConstraintViolation } from '@/lib/booking-errors';
import { generateMeetingLink } from '@/lib/meeting-link';
import { dispatchBookingNotifications } from '@/lib/notifications';
import {
  triggerWaitlistRecovery,
  addToWaitlist,
  getWorkspaceWaitlistEntries,
  notifyWaitlistEntry,
  cancelWaitlistEntry,
} from '@/lib/waitlist';

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

/**
 * Statuses a dashboard user may set. The type annotation is erased at the
 * server-action boundary, so the value is validated at runtime.
 */
const ALLOWED_STATUSES: readonly BookingStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
];

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

    if (
      !workspaceId ||
      !serviceId ||
      !staffId ||
      !date ||
      !time ||
      !customerName ||
      !customerEmail
    ) {
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
        meetingLink: service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null,
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
    if (!ALLOWED_STATUSES.includes(status)) {
      return { success: false, error: 'That is not a valid appointment status.' };
    }

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

      // Auto-recovery: Check waitlist for this slot and notify the earliest waiting client
      await triggerWaitlistRecovery(bookingId).catch((err) =>
        console.error('Waitlist recovery trigger failed:', err)
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

// ----------------------------------------------------
// FAST PASS (WALK-IN / PHONE QUICK BOOKER)
// ----------------------------------------------------

export interface FastPassBookingInput {
  workspaceId: string;
  serviceId: string;
  staffId?: string; // If empty or 'ANY', automatically finds first available staff
  customerPhone: string;
  customerName: string;
  customerEmail?: string;
  source: 'WALK_IN' | 'PHONE_CALL';
  immediate: boolean; // true = start right now, false = use custom date/time
  date?: string; // YYYY-MM-DD (required if immediate is false)
  time?: string; // HH:mm (required if immediate is false)
  notes?: string;
}

export interface FastPassActionResult {
  success: boolean;
  bookingId?: string;
  bookingDetails?: {
    id: string;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string;
    serviceName: string;
    staffName: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
    price: number;
    source: string;
  };
  error?: string;
}

export async function getFastPassInitDataAction(workspaceId: string) {
  try {
    await requireWorkspace(workspaceId, 'STAFF');
    const [services, staff] = await Promise.all([
      prisma.service.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, name: true, durationMinutes: true, price: true },
        orderBy: { name: 'asc' },
      }),
      prisma.staff.findMany({
        where: { workspaceId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      success: true,
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMinutes: s.durationMinutes,
        price: s.price ? Number(s.price) : 0,
      })),
      staff,
    };
  } catch (err) {
    return { success: false, services: [], staff: [], error: 'Failed to load Fast Pass options.' };
  }
}

export async function searchCustomerByPhoneOrEmailAction(
  workspaceId: string,
  query: string
): Promise<{
  success: boolean;
  customer?: { id: string; name: string; email: string; phone: string | null } | null;
}> {
  try {
    await requireWorkspace(workspaceId, 'STAFF');
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      return { success: true, customer: null };
    }

    const customer = await prisma.customer.findFirst({
      where: {
        workspaceId,
        OR: [
          { phone: { contains: trimmed, mode: 'insensitive' } },
          { email: { equals: trimmed.toLowerCase() } },
          { name: { contains: trimmed, mode: 'insensitive' } },
        ],
      },
      select: { id: true, name: true, email: true, phone: true },
    });

    return { success: true, customer };
  } catch (err) {
    return { success: false, customer: null };
  }
}

export async function createFastPassBookingAction(
  data: FastPassBookingInput
): Promise<FastPassActionResult> {
  try {
    const { workspaceId, serviceId } = data;
    const cleanPhone = data.customerPhone?.trim() ?? '';
    const cleanName = data.customerName?.trim() ?? '';

    if (!workspaceId || !serviceId) {
      return { success: false, error: 'Please choose a service.' };
    }
    if (!cleanPhone && !data.customerEmail) {
      return { success: false, error: 'Please enter a customer phone number or email.' };
    }
    if (!cleanName) {
      return { success: false, error: 'Please enter customer name.' };
    }

    await requireWorkspace(workspaceId, 'STAFF');
    const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
    const timezone = workspace.timezone || 'UTC';

    const service = await prisma.service.findFirst({
      where: { id: serviceId, workspaceId, isActive: true },
    });
    if (!service) {
      return { success: false, error: 'Selected service was not found in this workspace.' };
    }

    // Determine start & end time
    let startUtc: Date;
    if (data.immediate) {
      // Start immediately
      startUtc = new Date();
    } else {
      if (!data.date || !data.time || !DATE_PATTERN.test(data.date) || !TIME_PATTERN.test(data.time)) {
        return { success: false, error: 'Please provide a valid date (YYYY-MM-DD) and time (HH:mm).' };
      }
      startUtc = fromZonedTime(`${data.date}T${data.time}:00`, timezone);
      if (Number.isNaN(startUtc.getTime())) {
        return { success: false, error: 'Invalid date/time provided.' };
      }
    }
    const endUtc = addMinutes(startUtc, service.durationMinutes);

    // Resolve staff member
    let assignedStaff: { id: string; name: string } | null = null;
    const requestedStaffId = data.staffId && data.staffId !== 'ANY' ? data.staffId : null;

    if (requestedStaffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: requestedStaffId, workspaceId, isActive: true },
      });
      if (!staff) {
        return { success: false, error: 'Requested staff member not found in this workspace.' };
      }

      const conflict = await prisma.booking.findFirst({
        where: {
          staffId: requestedStaffId,
          status: { notIn: ['CANCELLED'] },
          AND: [{ startTime: { lt: endUtc } }, { endTime: { gt: startUtc } }],
        },
        select: { startTime: true, endTime: true },
      });

      if (conflict) {
        const from = formatInTimeZone(conflict.startTime, timezone, 'h:mm a');
        const to = formatInTimeZone(conflict.endTime, timezone, 'h:mm a');
        return {
          success: false,
          error: `${staff.name} is already booked between ${from} and ${to}.`,
        };
      }
      assignedStaff = staff;
    } else {
      // Auto-assign: Find active staff assigned to this service first
      const serviceAssignments = await prisma.serviceStaff.findMany({
        where: { serviceId },
        include: { staff: true },
      });
      let candidateStaffList = serviceAssignments
        .map((sa) => sa.staff)
        .filter((s) => s.isActive);

      if (candidateStaffList.length === 0) {
        candidateStaffList = await prisma.staff.findMany({
          where: { workspaceId, isActive: true },
        });
      }

      if (candidateStaffList.length === 0) {
        return { success: false, error: 'No active staff available in this workspace.' };
      }

      // Find first candidate without an overlapping booking
      for (const candidate of candidateStaffList) {
        const conflict = await prisma.booking.findFirst({
          where: {
            staffId: candidate.id,
            status: { notIn: ['CANCELLED'] },
            AND: [{ startTime: { lt: endUtc } }, { endTime: { gt: startUtc } }],
          },
        });
        if (!conflict) {
          assignedStaff = candidate;
          break;
        }
      }

      if (!assignedStaff) {
        return {
          success: false,
          error: 'All qualified staff members are currently booked during this time window.',
        };
      }
    }

    // Resolve customer
    let resolvedEmail = data.customerEmail?.toLowerCase().trim();
    if (!resolvedEmail) {
      // Check if existing customer has this phone number
      const existing = await prisma.customer.findFirst({
        where: { workspaceId, phone: cleanPhone },
      });
      if (existing) {
        resolvedEmail = existing.email;
      } else {
        const numericPhone = cleanPhone.replace(/[^0-9]/g, '');
        resolvedEmail = `${numericPhone || 'walkin-' + Date.now()}@walkin.local`;
      }
    }

    const customer = await prisma.customer.upsert({
      where: { workspaceId_email: { workspaceId, email: resolvedEmail } },
      update: {
        name: cleanName,
        phone: cleanPhone || undefined,
        notes: data.notes?.trim() || undefined,
      },
      create: {
        workspaceId,
        name: cleanName,
        email: resolvedEmail,
        phone: cleanPhone || undefined,
        notes: data.notes?.trim() || undefined,
      },
    });

    const booking = await prisma.booking.create({
      data: {
        workspaceId,
        serviceId,
        staffId: assignedStaff.id,
        customerId: customer.id,
        startTime: startUtc,
        endTime: endUtc,
        customerTimezone: timezone,
        status: 'CONFIRMED',
        source: data.source || 'WALK_IN',
        meetingLink: service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null,
        auditLogs: {
          create: {
            action: 'CREATED',
            actorType: 'STAFF',
            details: {
              createdVia: 'FAST_PASS',
              source: data.source || 'WALK_IN',
              immediate: data.immediate,
              customerPhone: cleanPhone,
              customerEmail: resolvedEmail,
              serviceName: service.name,
              staffName: assignedStaff.name,
              createdAt: new Date().toISOString(),
            },
          },
        },
      },
    });

    // Send notifications only if not an anonymous local walk-in address
    if (!resolvedEmail.endsWith('@walkin.local')) {
      await dispatchBookingNotifications(booking.id, 'BOOKING_CREATED').catch((err) =>
        console.error('Fast pass notification dispatch failed:', err)
      );
    }

    revalidatePath('/appointments');
    revalidatePath('/calendar');
    revalidatePath('/customers');

    return {
      success: true,
      bookingId: booking.id,
      bookingDetails: {
        id: booking.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email,
        serviceName: service.name,
        staffName: assignedStaff.name,
        startTime: formatInTimeZone(startUtc, timezone, 'h:mm a'),
        endTime: formatInTimeZone(endUtc, timezone, 'h:mm a'),
        durationMinutes: service.durationMinutes,
        price: service.price ? Number(service.price) : 0,
        source: booking.source || 'WALK_IN',
      },
    };
  } catch (err) {
    if (isOverlapConstraintViolation(err)) {
      return {
        success: false,
        error: 'Slot was just taken by another booking. Please choose another.',
      };
    }
    return toActionError(err);
  }
}

// ----------------------------------------------------
// SMART WAITLIST DASHBOARD MANAGEMENT ACTIONS
// ----------------------------------------------------

export async function getWorkspaceWaitlistAction(workspaceId: string, statusFilter?: any) {
  try {
    await requireWorkspace(workspaceId, 'STAFF');
    const entries = await getWorkspaceWaitlistEntries(workspaceId, statusFilter);
    return {
      success: true,
      entries: entries.map((e) => ({
        id: e.id,
        customerName: e.customerName,
        customerEmail: e.customerEmail,
        customerPhone: e.customerPhone,
        preferredDate: e.preferredDate.toISOString().split('T')[0],
        status: e.status,
        notes: e.notes,
        service: {
          id: e.service.id,
          name: e.service.name,
          durationMinutes: e.service.durationMinutes,
          price: e.service.price ? Number(e.service.price) : 0,
        },
        staff: e.staff ? { id: e.staff.id, name: e.staff.name } : null,
        claimToken: e.claimToken,
        notifiedAt: e.notifiedAt ? e.notifiedAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
      })),
    };
  } catch (err) {
    return { success: false, entries: [], error: 'Failed to load waitlist.' };
  }
}

export async function notifyWaitlistEntryAction(entryId: string) {
  try {
    const res = await notifyWaitlistEntry(entryId);
    revalidatePath('/appointments');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to notify waitlist client.' };
  }
}

export async function cancelWaitlistEntryAction(entryId: string) {
  try {
    const res = await cancelWaitlistEntry(entryId);
    revalidatePath('/appointments');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to cancel waitlist entry.' };
  }
}

export async function addToWaitlistDashboardAction(data: {
  workspaceId: string;
  serviceId: string;
  staffId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  preferredDate: string;
  notes?: string;
}) {
  try {
    await requireWorkspace(data.workspaceId, 'STAFF');
    const res = await addToWaitlist(data);
    revalidatePath('/appointments');
    return res;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add to waitlist.' };
  }
}
