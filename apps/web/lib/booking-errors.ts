/** Name of the Postgres exclusion constraint that blocks overlapping bookings. */
export const OVERLAP_CONSTRAINT = 'bookings_no_staff_overlap';

/**
 * Detect a rejection from the double-booking exclusion constraint.
 *
 * Two requests can both pass an application-level availability check and then
 * both try to insert. The database refuses the second one, and that rejection
 * surfaces here as Postgres error 23P01 (exclusion_violation). Prisma reports it
 * as a raw database error rather than a typed one, so both the code and the
 * constraint name are matched.
 */
export function isOverlapConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: unknown; message?: unknown; meta?: unknown };

  if (candidate.code === '23P01') return true;

  const meta = candidate.meta as { code?: unknown; message?: unknown } | undefined;
  if (meta?.code === '23P01') return true;

  // Only the phrase Postgres itself emits counts. Matching the bare constraint
  // name anywhere in the message would let a customer whose name contained it
  // turn an unrelated failure into a bogus "slot taken" reply.
  const haystack = [candidate.message, meta?.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return (
    haystack.includes(`exclusion constraint "${OVERLAP_CONSTRAINT}"`) || /\b23P01\b/.test(haystack)
  );
}

/**
 * Thrown when a group booking's seat count is already at Service.capacity.
 * Unlike double-booking, there is no Postgres constraint that can express
 * "at most N rows sharing this staff+slot", so capacity is enforced in
 * application code (guarded by an advisory lock) and needs its own signal
 * distinct from isOverlapConstraintViolation.
 */
export class BookingCapacityExceededError extends Error {
  constructor() {
    super('Booking capacity exceeded for this slot.');
    this.name = 'BookingCapacityExceededError';
  }
}
