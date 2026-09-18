import { prisma, Prisma } from '@bookings/database';
import { BookingCapacityExceededError } from './booking-errors';

/**
 * Creates the primary Booking row plus, for a collective service, the
 * BookingParticipant rows for every other required staff member — all in one
 * transaction so a capacity failure or a participant conflict leaves nothing
 * behind instead of an orphaned booking or a missing participant.
 *
 * Group-service capacity has no Postgres constraint to lean on the way
 * double-booking does (there's no way to express "at most N rows sharing this
 * staff+slot" in an EXCLUDE constraint), so it's enforced here: an advisory
 * lock keyed on staff+service serializes concurrent attempts, then the
 * current seat count is checked before the insert.
 *
 * Shared by every place that can create a booking against a group or
 * collective service (the public booking flow and the waitlist claim path),
 * so a fix here protects all of them instead of drifting between copies.
 */
export async function createBookingWithCapacityAndParticipants(
  bookingData: Prisma.BookingCreateArgs['data'],
  opts: {
    isGroupService: boolean;
    serviceId: string;
    staffId: string;
    startUtc: Date;
    endUtc: Date;
    capacity: number | null;
    participants: Array<{ staffId: string; startUtc: Date; endUtc: Date }>;
  }
) {
  return prisma.$transaction(async (tx) => {
    if (opts.isGroupService && opts.capacity) {
      // Locked per staff+service rather than per exact slot: add-ons make
      // effective duration vary per booking, so two bookings of the same
      // group service can genuinely overlap while starting at different
      // times. Only a lock scoped to the whole staff+service combination
      // reliably serializes every concurrent attempt against one capacity
      // pool; a lock keyed on the exact start time would let two different
      // start times race each other straight past the count check below.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${opts.staffId}), hashtext(${opts.serviceId}))`;

      // Counted by actual time-range overlap, not exact start-time equality,
      // for the same add-on-duration reason as the lock above.
      const used = await tx.booking.count({
        where: {
          staffId: opts.staffId,
          serviceId: opts.serviceId,
          status: { not: 'CANCELLED' },
          startTime: { lt: opts.endUtc },
          endTime: { gt: opts.startUtc },
        },
      });
      if (used >= opts.capacity) {
        throw new BookingCapacityExceededError();
      }
    }

    const booking = await tx.booking.create({ data: bookingData });

    if (opts.participants.length > 0) {
      await tx.bookingParticipant.createMany({
        data: opts.participants.map((p) => ({
          bookingId: booking.id,
          staffId: p.staffId,
          startTime: p.startUtc,
          endTime: p.endUtc,
        })),
      });
    }

    return booking;
  });
}
