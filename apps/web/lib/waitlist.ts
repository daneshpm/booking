import { prisma, type WaitlistStatus } from '@bookings/database';
import { startOfDay, addMinutes } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { generateMeetingLink } from './meeting-link';
import { dispatchBookingNotifications } from '@bookings/notifications';

export interface WaitlistRecoveryResult {
  recovered: boolean;
  notifiedCount: number;
  entry?: {
    id: string;
    customerName: string;
    customerEmail: string;
    claimToken: string;
  };
}

export interface AddToWaitlistInput {
  workspaceId: string;
  serviceId: string;
  staffId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  preferredDate: string; // YYYY-MM-DD
  notes?: string | null;
}

/**
 * Adds a customer to the priority waitlist for a specific service and date.
 */
export async function addToWaitlist(data: AddToWaitlistInput) {
  const { workspaceId, serviceId, preferredDate } = data;
  const cleanName = data.customerName.trim();
  const cleanEmail = data.customerEmail.toLowerCase().trim();
  const cleanPhone = data.customerPhone?.trim() || null;
  const cleanNotes = data.notes?.trim() || null;
  const staffId = data.staffId && data.staffId !== 'ANY' ? data.staffId : null;

  const dateObj = new Date(`${preferredDate}T00:00:00.000Z`);

  // Check if active waitlist entry already exists for this email, service, and date
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      workspaceId,
      serviceId,
      customerEmail: cleanEmail,
      preferredDate: dateObj,
      status: { in: ['WAITING', 'NOTIFIED'] },
    },
  });

  if (existing) {
    return {
      success: true,
      alreadyWaitlisted: true,
      entryId: existing.id,
      message: "You're already on the priority waitlist for this date!",
    };
  }

  const entry = await prisma.waitlistEntry.create({
    data: {
      workspaceId,
      serviceId,
      staffId,
      customerName: cleanName,
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      preferredDate: dateObj,
      notes: cleanNotes,
      status: 'WAITING',
    },
    include: {
      service: true,
      staff: true,
    },
  });

  return {
    success: true,
    entryId: entry.id,
    serviceName: entry.service.name,
  };
}

/**
 * Sweeps the waitlist when a booking is cancelled.
 * Finds the earliest waiting client requesting the service (and optionally staff)
 * on this date, generates a secure claim token, marks the entry NOTIFIED,
 * and records notification.
 */
export async function triggerWaitlistRecovery(
  cancelledBookingId: string
): Promise<WaitlistRecoveryResult> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: cancelledBookingId },
      include: {
        service: true,
        staff: true,
      },
    });

    if (!booking) {
      return { recovered: false, notifiedCount: 0 };
    }

    const bookingDate = startOfDay(booking.startTime);

    // Find the oldest waiting customer for this service & date
    const waitingEntry = await prisma.waitlistEntry.findFirst({
      where: {
        workspaceId: booking.workspaceId,
        serviceId: booking.serviceId,
        status: 'WAITING',
        preferredDate: bookingDate,
        OR: [{ staffId: null }, { staffId: booking.staffId }],
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!waitingEntry) {
      return { recovered: false, notifiedCount: 0 };
    }

    // Generate unique claim token
    const claimToken = `clm_${crypto.randomUUID().replace(/-/g, '')}`;

    const updated = await prisma.waitlistEntry.update({
      where: { id: waitingEntry.id },
      data: {
        status: 'NOTIFIED',
        claimToken,
        notifiedAt: new Date(),
      },
    });

    // Log notification audit
    await prisma.notificationLog.create({
      data: {
        workspaceId: booking.workspaceId,
        bookingId: booking.id,
        channel: 'EMAIL',
        recipient: waitingEntry.customerEmail,
        subject: `Spot Opened: ${booking.service.name} with ${booking.staff.name}`,
        status: 'SENT',
        sentAt: new Date(),
      },
    }).catch((err) => {
      console.warn('Failed to log waitlist notification record:', err);
    });

    return {
      recovered: true,
      notifiedCount: 1,
      entry: {
        id: updated.id,
        customerName: updated.customerName,
        customerEmail: updated.customerEmail,
        claimToken,
      },
    };
  } catch (err) {
    console.error('Waitlist recovery error:', err);
    return { recovered: false, notifiedCount: 0 };
  }
}

/**
 * Fetch all waitlist entries for a workspace.
 */
export async function getWorkspaceWaitlistEntries(
  workspaceId: string,
  statusFilter?: WaitlistStatus
) {
  return prisma.waitlistEntry.findMany({
    where: {
      workspaceId,
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    include: {
      service: {
        select: { id: true, name: true, durationMinutes: true, price: true },
      },
      staff: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
  });
}

/**
 * Manually trigger notification for a specific waitlist entry.
 */
export async function notifyWaitlistEntry(entryId: string) {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: { service: true, staff: true, workspace: true },
  });

  if (!entry) {
    return { success: false, error: 'Waitlist entry not found.' };
  }

  const claimToken = entry.claimToken || `clm_${crypto.randomUUID().replace(/-/g, '')}`;

  const updated = await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: {
      status: 'NOTIFIED',
      claimToken,
      notifiedAt: new Date(),
    },
  });

  await prisma.notificationLog.create({
    data: {
      workspaceId: entry.workspaceId,
      channel: 'EMAIL',
      recipient: entry.customerEmail,
      subject: `Spot Opened: ${entry.service.name}`,
      status: 'SENT',
      sentAt: new Date(),
    },
  }).catch((err) => {
    console.warn('Failed to log waitlist notification record:', err);
  });

  return {
    success: true,
    claimToken,
    entry: updated,
  };
}

/**
 * Cancel a waitlist entry.
 */
export async function cancelWaitlistEntry(entryId: string) {
  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status: 'CANCELLED' },
  });
  return { success: true };
}

/**
 * Resolves a claim token when a customer visits the claim link.
 */
export async function getWaitlistEntryByClaimToken(token: string) {
  return prisma.waitlistEntry.findUnique({
    where: { claimToken: token },
    include: {
      workspace: true,
      service: true,
      staff: true,
    },
  });
}

/**
 * Claim an opened spot and convert waitlist entry to a confirmed booking.
 */
export async function claimWaitlistSpot(token: string) {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { claimToken: token },
    include: {
      workspace: true,
      service: true,
      staff: true,
    },
  });

  if (!entry) {
    return { success: false, error: 'Invalid or expired claim link.' };
  }

  if (entry.status === 'CLAIMED') {
    return {
      success: false,
      error: 'This appointment spot has already been claimed.',
    };
  }

  if (entry.status === 'CANCELLED' || entry.status === 'EXPIRED') {
    return {
      success: false,
      error: 'This waitlist claim has expired or was cancelled.',
    };
  }

  const timezone = entry.workspace.timezone || 'UTC';
  const service = entry.service;

  // Resolve staff
  let staffId = entry.staffId;
  if (!staffId) {
    // Pick first available staff
    const assignedStaff = await prisma.serviceStaff.findMany({
      where: { serviceId: service.id },
      include: { staff: true },
    });
    const activeStaff = assignedStaff.map((s) => s.staff).filter((s) => s.isActive);
    if (activeStaff.length > 0) {
      staffId = activeStaff[0].id;
    } else {
      const anyStaff = await prisma.staff.findFirst({
        where: { workspaceId: entry.workspaceId, isActive: true },
      });
      if (anyStaff) staffId = anyStaff.id;
    }
  }

  if (!staffId) {
    return { success: false, error: 'No staff available to fulfill this booking.' };
  }

  // Calculate start and end time (default to 10:00 AM on preferred date if not specified)
  const yyyy = entry.preferredDate.getFullYear();
  const mm = String(entry.preferredDate.getMonth() + 1).padStart(2, '0');
  const dd = String(entry.preferredDate.getDate()).padStart(2, '0');
  const startUtc = fromZonedTime(`${yyyy}-${mm}-${dd}T10:00:00`, timezone);
  const endUtc = addMinutes(startUtc, service.durationMinutes);

  // Upsert customer
  const customer = await prisma.customer.upsert({
    where: {
      workspaceId_email: {
        workspaceId: entry.workspaceId,
        email: entry.customerEmail,
      },
    },
    update: {
      name: entry.customerName,
      phone: entry.customerPhone || undefined,
    },
    create: {
      workspaceId: entry.workspaceId,
      name: entry.customerName,
      email: entry.customerEmail,
      phone: entry.customerPhone || undefined,
    },
  });

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      workspaceId: entry.workspaceId,
      serviceId: service.id,
      staffId,
      customerId: customer.id,
      startTime: startUtc,
      endTime: endUtc,
      customerTimezone: timezone,
      status: 'CONFIRMED',
      source: 'ONLINE',
      meetingLink: service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null,
      auditLogs: {
        create: {
          action: 'CREATED',
          actorType: 'CUSTOMER',
          details: {
            createdVia: 'WAITLIST_CLAIM',
            waitlistEntryId: entry.id,
            claimToken: token,
            createdAt: new Date().toISOString(),
          },
        },
      },
    },
  });

  // Mark waitlist entry CLAIMED
  await prisma.waitlistEntry.update({
    where: { id: entry.id },
    data: {
      status: 'CLAIMED',
      claimedBookingId: booking.id,
    },
  });

  // Send booking confirmation notification
  await dispatchBookingNotifications(booking.id, 'BOOKING_CREATED').catch((err) =>
    console.error('Waitlist claim booking notification failed:', err)
  );

  return {
    success: true,
    bookingId: booking.id,
    customerName: customer.name,
    serviceName: service.name,
    startTime: formatInTimeZone(startUtc, timezone, 'MMMM d, yyyy h:mm a'),
  };
}
