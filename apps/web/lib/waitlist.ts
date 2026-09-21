import { prisma, type WaitlistStatus } from '@bookings/database';
import { addMinutes } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { generateMeetingLink } from './meeting-link';
import { dispatchBookingNotifications } from '@bookings/notifications';
import { createBookingWithCapacityAndParticipants } from './booking-capacity';
import { logger } from '@bookings/core';

/**
 * How long a claim link stays usable after the customer was notified.
 *
 * Without a window a token minted months ago still books a slot, and the
 * "expired" wording the claim page already shows would never be true.
 */
export const CLAIM_WINDOW_HOURS = 24;

/** Hour of the workspace day a claimed spot is placed at, in 24h form. */
const CLAIM_DEFAULT_HOUR = '10:00';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
 * preferredDate is a Postgres DATE. Prisma reads and writes those as a Date
 * pinned to UTC midnight, so every conversion in this file has to use the UTC
 * accessors. Local ones silently shift the calendar day for any server that is
 * not running on UTC.
 */
function utcDateFromKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

function utcDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function isExpiredClaim(notifiedAt: Date | null): boolean {
  if (!notifiedAt) return false;
  return Date.now() - notifiedAt.getTime() > CLAIM_WINDOW_HOURS * 60 * 60 * 1000;
}

function newClaimToken(): string {
  return `clm_${crypto.randomUUID().replace(/-/g, '')}`;
}

/**
 * Adds a customer to the priority waitlist for a specific service and date.
 *
 * The caller is responsible for having verified that serviceId and staffId
 * belong to workspaceId; this helper is reached from both a public action and
 * a dashboard action and does not re-derive the tenant.
 */
export async function addToWaitlist(data: AddToWaitlistInput) {
  const { workspaceId, serviceId, preferredDate } = data;

  if (!DATE_PATTERN.test(preferredDate)) {
    return { success: false as const, error: 'Please choose a valid date.' };
  }

  const cleanName = data.customerName.trim();
  const cleanEmail = data.customerEmail.toLowerCase().trim();
  const cleanPhone = data.customerPhone?.trim() || null;
  const cleanNotes = data.notes?.trim() || null;
  const staffId = data.staffId && data.staffId !== 'ANY' ? data.staffId : null;

  const dateObj = utcDateFromKey(preferredDate);
  if (Number.isNaN(dateObj.getTime())) {
    return { success: false as const, error: 'Please choose a valid date.' };
  }

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
      success: true as const,
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
    success: true as const,
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
  cancelledBookingId: string,
  vacatedStartTime?: Date
): Promise<WaitlistRecoveryResult> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: cancelledBookingId },
      include: {
        service: true,
        staff: true,
        workspace: true,
      },
    });

    if (!booking) {
      return { recovered: false, notifiedCount: 0 };
    }

    // A reschedule updates the booking's startTime before calling this, so the
    // freshly re-fetched row reflects the NEW time rather than the vacated one.
    // Callers that moved a booking must pass the time that was actually freed.
    const referenceStart = vacatedStartTime ?? booking.startTime;

    // The waitlist stores the calendar day the customer asked for, read in the
    // workspace's timezone. Deriving it from the server's local day would miss
    // every entry whenever the two disagree, which silently disables recovery.
    const timezone = booking.workspace.timezone || 'UTC';
    const bookingDate = utcDateFromKey(formatInTimeZone(referenceStart, timezone, 'yyyy-MM-dd'));

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
    const claimToken = newClaimToken();

    const updated = await prisma.waitlistEntry.update({
      where: { id: waitingEntry.id },
      data: {
        status: 'NOTIFIED',
        claimToken,
        notifiedAt: new Date(),
      },
    });

    // Log notification audit
    await prisma.notificationLog
      .create({
        data: {
          workspaceId: booking.workspaceId,
          bookingId: booking.id,
          channel: 'EMAIL',
          recipient: waitingEntry.customerEmail,
          subject: `Spot Opened: ${booking.service.name} with ${booking.staff.name}`,
          status: 'SENT',
          sentAt: new Date(),
        },
      })
      .catch((err) => {
        logger.warn('Failed to log waitlist notification record', { err });
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
    logger.error('Waitlist recovery error', { err });
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
 *
 * workspaceId is required and scopes the lookup: this mints a claim token that
 * books an appointment, so an unscoped entry id would let one tenant issue
 * tokens against another tenant's waitlist.
 */
export async function notifyWaitlistEntry(entryId: string, workspaceId: string) {
  const entry = await prisma.waitlistEntry.findFirst({
    where: { id: entryId, workspaceId },
    include: { service: true, staff: true, workspace: true },
  });

  if (!entry) {
    return { success: false as const, error: 'Waitlist entry not found.' };
  }

  // Re-notifying a settled entry would hand out a second live token for a spot
  // that is already booked, cancelled or gone.
  if (entry.status === 'CLAIMED') {
    return { success: false as const, error: 'This entry has already been claimed.' };
  }
  if (entry.status === 'CANCELLED' || entry.status === 'EXPIRED') {
    return { success: false as const, error: 'This entry is no longer active.' };
  }

  // A fresh notification restarts the claim window, so it needs a fresh token
  // whenever the previous one has already aged out.
  const claimToken =
    entry.claimToken && !isExpiredClaim(entry.notifiedAt) ? entry.claimToken : newClaimToken();

  const updated = await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: {
      status: 'NOTIFIED',
      claimToken,
      notifiedAt: new Date(),
    },
  });

  await prisma.notificationLog
    .create({
      data: {
        workspaceId: entry.workspaceId,
        channel: 'EMAIL',
        recipient: entry.customerEmail,
        subject: `Spot Opened: ${entry.service.name}`,
        status: 'SENT',
        sentAt: new Date(),
      },
    })
    .catch((err) => {
      logger.warn('Failed to log waitlist notification record', { err });
    });

  return {
    success: true as const,
    claimToken,
    entry: updated,
  };
}

/**
 * Cancel a waitlist entry. Scoped to the workspace for the same reason as
 * notifyWaitlistEntry: the id alone must not be enough to reach across tenants.
 */
export async function cancelWaitlistEntry(entryId: string, workspaceId: string) {
  const { count } = await prisma.waitlistEntry.updateMany({
    where: { id: entryId, workspaceId },
    data: { status: 'CANCELLED', claimToken: null },
  });

  if (count === 0) {
    return { success: false as const, error: 'Waitlist entry not found.' };
  }
  return { success: true as const };
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
    return { success: false as const, error: 'Invalid or expired claim link.' };
  }

  if (entry.status === 'CLAIMED') {
    return {
      success: false as const,
      error: 'This appointment spot has already been claimed.',
    };
  }

  if (entry.status === 'CANCELLED' || entry.status === 'EXPIRED') {
    return {
      success: false as const,
      error: 'This waitlist claim has expired or was cancelled.',
    };
  }

  if (isExpiredClaim(entry.notifiedAt)) {
    await prisma.waitlistEntry.updateMany({
      where: { id: entry.id, status: 'NOTIFIED' },
      data: { status: 'EXPIRED', claimToken: null },
    });
    return {
      success: false as const,
      error: 'This claim link has expired. Please book a new time or rejoin the waitlist.',
    };
  }

  const timezone = entry.workspace.timezone || 'UTC';
  const service = entry.service;
  const isGroupService = Boolean(service.capacity && service.capacity > 1);

  // This flow has no payment step at all — claiming immediately books
  // CONFIRMED/PAID with no price collected. That is fine for a free service,
  // but for a paid one it was silently giving the session away for free.
  // Rather than half-build a payment step here, a paid service is directed
  // to the regular booking page instead, which already collects payment.
  if (Number(service.price) > 0) {
    return {
      success: false as const,
      error:
        'This is a paid service and cannot be claimed here. Please book it from the booking page to complete payment.',
    };
  }

  // preferredDate is a DATE column, so it arrives at UTC midnight. Reading it
  // with the local accessors moves it a day back on any server west of UTC.
  const dateKey = utcDateKey(entry.preferredDate);
  const startUtc = fromZonedTime(`${dateKey}T${CLAIM_DEFAULT_HOUR}:00`, timezone);
  const endUtc = addMinutes(startUtc, service.durationMinutes);

  if (Number.isNaN(startUtc.getTime())) {
    return { success: false as const, error: 'This waitlist entry has an invalid date.' };
  }

  if (startUtc.getTime() <= Date.now()) {
    await prisma.waitlistEntry.updateMany({
      where: { id: entry.id, status: 'NOTIFIED' },
      data: { status: 'EXPIRED', claimToken: null },
    });
    return {
      success: false as const,
      error: 'The date this spot was held for has already passed.',
    };
  }

  // Resolve staff, skipping anyone already busy in the window. Picking the
  // first active member without checking would hand the booking to someone who
  // cannot take it, and the overlap constraint would then reject the insert.
  const candidates: { id: string }[] = [];
  if (entry.staffId) {
    candidates.push({ id: entry.staffId });
  } else {
    const assignedStaff = await prisma.serviceStaff.findMany({
      where: { serviceId: service.id },
      include: { staff: true },
    });
    for (const s of assignedStaff) {
      if (s.staff.isActive) candidates.push({ id: s.staff.id });
    }
    if (candidates.length === 0) {
      const anyStaff = await prisma.staff.findMany({
        where: { workspaceId: entry.workspaceId, isActive: true },
        select: { id: true },
      });
      candidates.push(...anyStaff);
    }
  }

  let staffId: string | null = null;
  for (const candidate of candidates) {
    // A group service's own other bookings at this slot are capacity used,
    // not a conflict — the same distinction the public booking flow makes.
    // The actual seat count is still enforced atomically below.
    const conflict = await prisma.booking.findFirst({
      where: {
        staffId: candidate.id,
        status: { notIn: ['CANCELLED'] },
        ...(isGroupService ? { serviceId: { not: service.id } } : {}),
        AND: [{ startTime: { lt: endUtc } }, { endTime: { gt: startUtc } }],
      },
      select: { id: true },
    });
    if (!conflict) {
      staffId = candidate.id;
      break;
    }
  }

  if (!staffId) {
    return {
      success: false as const,
      error: 'That spot has just been taken. Please pick another time on the booking page.',
    };
  }

  // Take the entry first, conditioned on it still being NOTIFIED. Two clicks on
  // the same link land here concurrently; without this only one of them may go
  // on to create a booking.
  const claimed = await prisma.waitlistEntry.updateMany({
    where: { id: entry.id, status: 'NOTIFIED' },
    data: { status: 'CLAIMED', claimToken: null },
  });

  if (claimed.count === 0) {
    return {
      success: false as const,
      error: 'This appointment spot has already been claimed.',
    };
  }

  try {
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

    // Create booking. Routed through the same capacity-aware helper the
    // public booking flow uses: a direct create here would skip both the
    // isGroupBooking flag (letting the row wrongly participate in the
    // no-overlap exclusion constraint) and the atomic seat-count check
    // (letting a claim push a group class over capacity).
    const booking = await createBookingWithCapacityAndParticipants(
      {
        workspaceId: entry.workspaceId,
        serviceId: service.id,
        staffId,
        customerId: customer.id,
        startTime: startUtc,
        endTime: endUtc,
        customerTimezone: timezone,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        paymentProvider: 'FREE',
        paidAt: new Date(),
        paidPrice: 0,
        isGroupBooking: isGroupService,
        source: 'ONLINE',
        meetingLink: service.locationType === 'ONLINE_MEETING' ? generateMeetingLink() : null,
        auditLogs: {
          create: {
            action: 'CREATED',
            actorType: 'CUSTOMER',
            details: {
              createdVia: 'WAITLIST_CLAIM',
              waitlistEntryId: entry.id,
              createdAt: new Date().toISOString(),
            },
          },
        },
      },
      {
        isGroupService,
        serviceId: service.id,
        staffId,
        startUtc,
        endUtc,
        capacity: service.capacity ?? null,
        participants: [],
      }
    );

    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { claimedBookingId: booking.id },
    });

    // Send booking confirmation notification
    await dispatchBookingNotifications(booking.id, 'BOOKING_CREATED').catch((err) =>
      logger.error('Waitlist claim booking notification failed', { err })
    );

    return {
      success: true as const,
      bookingId: booking.id,
      customerName: customer.name,
      serviceName: service.name,
      startTime: formatInTimeZone(startUtc, timezone, 'MMMM d, yyyy h:mm a'),
    };
  } catch (err) {
    // The entry was already marked CLAIMED above. Nothing was booked, so put it
    // back rather than stranding the customer with a dead link.
    await prisma.waitlistEntry
      .updateMany({
        where: { id: entry.id, status: 'CLAIMED' },
        data: { status: 'NOTIFIED', claimToken: token },
      })
      .catch((restoreErr) =>
        logger.error('Failed to restore waitlist entry after claim failure', { err: restoreErr })
      );

    logger.error('Waitlist claim failed', { err });
    return {
      success: false as const,
      error: 'We could not confirm that spot. Please try again or book another time.',
    };
  }
}
