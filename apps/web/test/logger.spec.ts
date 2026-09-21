import { describe, it, expect } from 'vitest';
import { redact, maskEmail, maskPhone, REDACTED } from '@bookings/core';

/**
 * Redaction is the part of the logger with a security consequence. The old
 * `console.error('failed:', obj)` calls passed whatever object was to hand —
 * booking payloads carrying customer names, addresses and phone numbers, and
 * user records carrying password hashes and session tokens.
 *
 * These assert the redactor works by key structure, so a field added later is
 * covered without anyone remembering to add it here.
 */
describe('log redaction', () => {
  it('removes secrets by key, whatever the value looks like', () => {
    const out = redact({
      password: 'hunter2',
      passwordHash: '$2b$12$abcdefg',
      sessionToken: 'abc123',
      refreshToken: 'def456',
      apiKey: 'sk_live_1',
      api_key: 'sk_live_2',
      secret: 's',
      signature: 'sig',
      authorization: 'Bearer x',
      cookie: 'rb_session=x',
      credential: 'c',
      salt: 's',
      otp: '123456',
      cvv: '999',
    }) as Record<string, unknown>;

    for (const [key, value] of Object.entries(out)) {
      expect(value, `${key} was not redacted`).toBe(REDACTED);
    }
  });

  it('redacts regardless of case or surrounding words in the key', () => {
    const out = redact({
      userPassword: 'x',
      PASSWORD_HASH: 'y',
      stripeSecretKey: 'z',
      xRequestSignature: 'w',
    }) as Record<string, unknown>;

    expect(Object.values(out)).toEqual([REDACTED, REDACTED, REDACTED, REDACTED]);
  });

  it('keeps identifiers that are safe and useful to log', () => {
    const out = redact({
      bookingId: 'b1',
      workspaceId: 'w1',
      staffId: 's1',
      status: 'CONFIRMED',
      durationMinutes: 30,
    }) as Record<string, unknown>;

    expect(out).toEqual({
      bookingId: 'b1',
      workspaceId: 'w1',
      staffId: 's1',
      status: 'CONFIRMED',
      durationMinutes: 30,
    });
  });

  it('reduces personal data rather than dropping it, so lines can still be matched up', () => {
    const out = redact({
      customerEmail: 'ravi@example.com',
      customerPhone: '+91 98765 43210',
    }) as Record<string, string>;

    expect(out.customerEmail).toBe('r***@example.com');
    expect(out.customerPhone).toBe('***10');
    // The point of masking rather than redacting: the domain and last digits
    // are enough to correlate, not enough to identify.
    expect(out.customerEmail).not.toContain('ravi');
    expect(out.customerPhone).not.toContain('98765');
  });

  it('reaches secrets nested inside objects and arrays', () => {
    const out = redact({
      booking: { customer: { email: 'a@b.com', password: 'p' } },
      sessions: [{ token: 't1' }, { token: 't2' }],
    }) as any;

    expect(out.booking.customer.password).toBe(REDACTED);
    expect(out.booking.customer.email).toBe('a***@b.com');
    expect(out.sessions[0].token).toBe(REDACTED);
    expect(out.sessions[1].token).toBe(REDACTED);
  });

  it('serialises an Error without losing the message', () => {
    const out = redact(new Error('connection refused')) as Record<string, unknown>;

    expect(out.name).toBe('Error');
    expect(out.message).toBe('connection refused');
    expect(typeof out.stack).toBe('string');
  });

  it('caps depth, array length and string length', () => {
    const deep = { a: { b: { c: { d: { e: 'too far' } } } } };
    expect(JSON.stringify(redact(deep))).toContain('depth-limit');

    const long = redact({ items: Array.from({ length: 50 }, (_, i) => i) }) as {
      items: unknown[];
    };
    expect(long.items).toHaveLength(21);
    expect(long.items[20]).toBe('…30 more');

    const big = redact('x'.repeat(2000)) as string;
    expect(big.length).toBeLessThan(600);
    expect(big).toContain('[truncated]');
  });

  it('handles values that are not plain data', () => {
    expect(redact(null)).toBeNull();
    expect(redact(undefined)).toBeUndefined();
    expect(redact(() => 1)).toBeUndefined();
    expect(redact(10n)).toBe('10');
    expect(redact(new Date('2026-01-01T00:00:00.000Z'))).toBe('2026-01-01T00:00:00.000Z');
  });
});

describe('masking helpers', () => {
  it('refuses to guess at a malformed address', () => {
    expect(maskEmail('@example.com')).toBe(REDACTED);
    expect(maskEmail('not-an-email')).toBe(REDACTED);
  });

  it('refuses to mask a number too short to mask safely', () => {
    expect(maskPhone('12')).toBe(REDACTED);
    expect(maskPhone('987654321')).toBe('***21');
  });
});
