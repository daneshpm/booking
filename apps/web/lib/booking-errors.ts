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

  const haystack = [candidate.message, meta?.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return haystack.includes(OVERLAP_CONSTRAINT) || haystack.includes('23P01');
}
