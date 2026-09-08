import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isSmsConfigured,
  isValidPhoneNumber,
  truncateForSms,
  sendSms,
  MAX_SMS_LENGTH,
} from '../src/channels/sms';

const ENV_KEYS = ['SMS_ACCOUNT_SID', 'SMS_AUTH_TOKEN', 'SMS_FROM_NUMBER', 'SMS_API_BASE_URL'];

describe('SMS configuration', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it('reports itself unconfigured with no credentials', () => {
    expect(isSmsConfigured()).toBe(false);
  });

  it('reports itself unconfigured when only some credentials are present', () => {
    process.env.SMS_ACCOUNT_SID = 'sid';
    expect(isSmsConfigured()).toBe(false);
    process.env.SMS_AUTH_TOKEN = 'token';
    expect(isSmsConfigured()).toBe(false);
  });

  it('reports itself configured once every credential is set', () => {
    process.env.SMS_ACCOUNT_SID = 'sid';
    process.env.SMS_AUTH_TOKEN = 'token';
    process.env.SMS_FROM_NUMBER = '+15550000000';
    expect(isSmsConfigured()).toBe(true);
  });

  it('reports rather than throws when asked to send while unconfigured', async () => {
    // A missing provider must not break the booking that triggered the message.
    const result = await sendSms({ to: '+919876543210', body: 'hello' });
    expect(result.delivered).toBe(false);
    expect(result.error).toMatch(/not configured/);
  });
});

describe('phone number validation', () => {
  it('accepts international numbers', () => {
    expect(isValidPhoneNumber('+919876543210')).toBe(true);
    expect(isValidPhoneNumber('+14155552671')).toBe(true);
    expect(isValidPhoneNumber('  +442071838750  ')).toBe(true);
  });

  it('rejects a number with no country code', () => {
    // Providers bill per attempt, so a number that cannot route is refused
    // before it costs anything.
    expect(isValidPhoneNumber('9876543210')).toBe(false);
    expect(isValidPhoneNumber('020 7183 8750')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidPhoneNumber('')).toBe(false);
    expect(isValidPhoneNumber('+')).toBe(false);
    expect(isValidPhoneNumber('+0123456789')).toBe(false);
    expect(isValidPhoneNumber('+1234')).toBe(false);
    expect(isValidPhoneNumber('+1234567890123456789')).toBe(false);
    expect(isValidPhoneNumber('+44 not a number')).toBe(false);
  });
});

describe('message shortening', () => {
  it('collapses the newlines an email template uses', () => {
    expect(truncateForSms('Hello there,\n\nYour booking is confirmed.')).toBe(
      'Hello there, Your booking is confirmed.'
    );
  });

  it('leaves a short message alone', () => {
    expect(truncateForSms('Short message')).toBe('Short message');
  });

  it('truncates an over-long message rather than sending several parts', () => {
    const result = truncateForSms('a'.repeat(MAX_SMS_LENGTH + 200));
    expect(result).toHaveLength(MAX_SMS_LENGTH);
    expect(result.endsWith('...')).toBe(true);
  });

  it('keeps a message that is exactly at the limit', () => {
    const exact = 'b'.repeat(MAX_SMS_LENGTH);
    expect(truncateForSms(exact)).toBe(exact);
  });
});
