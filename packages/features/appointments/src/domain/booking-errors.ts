export const OVERLAP_CONSTRAINT = 'bookings_no_staff_overlap';

export function isOverlapConstraintViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as { code?: unknown; message?: unknown; meta?: unknown };

  if (candidate.code === '23P01') return true;

  const meta = candidate.meta as { code?: unknown; message?: unknown } | undefined;
  if (meta?.code === '23P01') return true;

  const haystack = [candidate.message, meta?.message]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return (
    haystack.includes(`exclusion constraint "${OVERLAP_CONSTRAINT}"`) || /\b23P01\b/.test(haystack)
  );
}

export class BookingCapacityExceededError extends Error {
  constructor() {
    super('Booking capacity exceeded for this slot.');
    this.name = 'BookingCapacityExceededError';
  }
}

