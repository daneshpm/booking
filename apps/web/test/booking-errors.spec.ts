import { describe, it, expect } from 'vitest';
import { isOverlapConstraintViolation, OVERLAP_CONSTRAINT } from '../lib/booking-errors';

describe('overlap constraint detection', () => {
  it('recognises the Postgres exclusion violation code at the top level', () => {
    expect(isOverlapConstraintViolation({ code: '23P01' })).toBe(true);
  });

  it('recognises the code nested under Prisma meta', () => {
    expect(isOverlapConstraintViolation({ meta: { code: '23P01' } })).toBe(true);
  });

  it('recognises the constraint by name in the message', () => {
    expect(
      isOverlapConstraintViolation({
        message: `conflicting key value violates exclusion constraint "${OVERLAP_CONSTRAINT}"`,
      })
    ).toBe(true);
  });

  it('recognises the constraint name in a nested meta message', () => {
    expect(
      isOverlapConstraintViolation({ meta: { message: `violates ${OVERLAP_CONSTRAINT}` } })
    ).toBe(true);
  });

  it('ignores an unrelated database error', () => {
    // A unique violation must not be reported as a scheduling clash, or the
    // customer is told to pick another time for a problem that is not theirs.
    expect(isOverlapConstraintViolation({ code: 'P2002' })).toBe(false);
    expect(isOverlapConstraintViolation({ code: '23505' })).toBe(false);
  });

  it('ignores an ordinary error', () => {
    expect(isOverlapConstraintViolation(new Error('Connection refused'))).toBe(false);
  });

  it('handles null, undefined and primitives without throwing', () => {
    expect(isOverlapConstraintViolation(null)).toBe(false);
    expect(isOverlapConstraintViolation(undefined)).toBe(false);
    expect(isOverlapConstraintViolation('23P01')).toBe(false);
    expect(isOverlapConstraintViolation(42)).toBe(false);
  });
});
