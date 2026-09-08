import { describe, it, expect } from 'vitest';
import { isOverlapConstraintViolation, OVERLAP_CONSTRAINT } from '../lib/booking-errors';

/** The wording Postgres itself produces for an exclusion violation. */
const POSTGRES_MESSAGE = `conflicting key value violates exclusion constraint "${OVERLAP_CONSTRAINT}"`;

describe('overlap constraint detection', () => {
  it('recognises the Postgres exclusion violation code at the top level', () => {
    expect(isOverlapConstraintViolation({ code: '23P01' })).toBe(true);
  });

  it('recognises the code nested under Prisma meta', () => {
    expect(isOverlapConstraintViolation({ meta: { code: '23P01' } })).toBe(true);
  });

  it('recognises the real Postgres message', () => {
    expect(isOverlapConstraintViolation({ message: POSTGRES_MESSAGE })).toBe(true);
  });

  it('recognises the real message nested under meta', () => {
    expect(isOverlapConstraintViolation({ meta: { message: POSTGRES_MESSAGE } })).toBe(true);
  });

  it('recognises the bare SQLSTATE appearing in a message', () => {
    expect(isOverlapConstraintViolation({ message: 'database error 23P01 raised' })).toBe(true);
  });

  it('ignores an unrelated database error', () => {
    // A unique violation must not be reported as a scheduling clash, or the
    // customer is told to pick another time for a problem that is not theirs.
    expect(isOverlapConstraintViolation({ code: 'P2002' })).toBe(false);
    expect(isOverlapConstraintViolation({ code: '23505' })).toBe(false);
  });

  it('does not match the constraint name appearing on its own', () => {
    // Customer names reach Prisma error messages as query arguments. Matching a
    // bare constraint name would let someone booking under that name turn an
    // unrelated failure into a bogus "slot taken" reply, hiding a real error.
    expect(
      isOverlapConstraintViolation({
        message: `Invalid value for argument name: ${OVERLAP_CONSTRAINT}`,
      })
    ).toBe(false);
  });

  it('does not match a longer code that merely contains the SQLSTATE', () => {
    expect(isOverlapConstraintViolation({ message: 'error X23P01Y occurred' })).toBe(false);
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
