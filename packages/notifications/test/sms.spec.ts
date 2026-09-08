import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isSmsConfigured,
  isValidPhoneNumber,
  gatewayAddressFor,
  truncateForSms,
  sendSms,
  MAX_SMS_LENGTH,
} from '../src/channels/sms';

const ENV_KEYS = [
  'SMS_GATEWAY_DOMAIN',
  'SMS_GATEWAY_STRIP_COUNTRY_CODE',
  'SMS_GATEWAY_SUBJECT',
  'SMTP_HOST',
];

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

  it('reports itself unconfigured with no gateway', () => {
    process.env.SMTP_HOST = 'localhost';
    expect(isSmsConfigured()).toBe(false);
  });

  it('reports itself unconfigured when SMTP is missing', () => {
    // The gateway is reached over SMTP, so a mail transport is required too.
    process.env.SMS_GATEWAY_DOMAIN = 'sms.example.net';
    expect(isSmsConfigured()).toBe(false);
  });

  it('reports itself configured once both are set', () => {
    process.env.SMS_GATEWAY_DOMAIN = 'sms.example.net';
    process.env.SMTP_HOST = 'localhost';
    expect(isSmsConfigured()).toBe(true);
  });

  it('reports rather than throws when asked to send with no gateway', async () => {
    // A missing gateway must not break the booking that triggered the message.
    process.env.SMTP_HOST = 'localhost';
    const result = await sendSms({ to: '+919876543210', body: 'hello' });
    expect(result.delivered).toBe(false);
    expect(result.error).toMatch(/not configured/);
  });

  it('explains when the gateway is set but SMTP is not', async () => {
    process.env.SMS_GATEWAY_DOMAIN = 'sms.example.net';
    const result = await sendSms({ to: '+919876543210', body: 'hello' });
    expect(result.delivered).toBe(false);
    expect(result.error).toMatch(/SMTP/);
  });

  it('refuses an unusable number before handing it to the gateway', async () => {
    process.env.SMS_GATEWAY_DOMAIN = 'sms.example.net';
    process.env.SMTP_HOST = 'localhost';
    const result = await sendSms({ to: '9876543210', body: 'hello' });
    expect(result.delivered).toBe(false);
    expect(result.error).toMatch(/international phone number/);
  });
});

describe('gateway address', () => {
  const saved = process.env.SMS_GATEWAY_STRIP_COUNTRY_CODE;

  beforeEach(() => {
    delete process.env.SMS_GATEWAY_STRIP_COUNTRY_CODE;
  });

  afterEach(() => {
    if (saved === undefined) delete process.env.SMS_GATEWAY_STRIP_COUNTRY_CODE;
    else process.env.SMS_GATEWAY_STRIP_COUNTRY_CODE = saved;
  });

  it('uses the digits of the number at the gateway domain', () => {
    expect(gatewayAddressFor('+919876543210', 'sms.example.net')).toBe(
      '919876543210@sms.example.net'
    );
  });

  it('drops formatting characters', () => {
    expect(gatewayAddressFor('+91 98765 43210', 'sms.example.net')).toBe(
      '919876543210@sms.example.net'
    );
    expect(gatewayAddressFor('+1 (415) 555-2671', 'txt.example.net')).toBe(
      '14155552671@txt.example.net'
    );
  });

  it('strips the country code for a gateway that wants a national number', () => {
    process.env.SMS_GATEWAY_STRIP_COUNTRY_CODE = '91';
    expect(gatewayAddressFor('+919876543210', 'sms.example.net')).toBe(
      '9876543210@sms.example.net'
    );
  });

  it('leaves the number alone when it does not start with that country code', () => {
    process.env.SMS_GATEWAY_STRIP_COUNTRY_CODE = '91';
    expect(gatewayAddressFor('+14155552671', 'sms.example.net')).toBe(
      '14155552671@sms.example.net'
    );
  });

  it('produces exactly one address, never a header injection', () => {
    // The number is reduced to digits, so nothing a customer typed can add a
    // recipient or a header to the outgoing message.
    const address = gatewayAddressFor('+91987\r\nBcc: someone@evil.test', 'sms.example.net');
    expect(address).toBe('91987@sms.example.net');
    expect(address).not.toMatch(/[\r\n]/);
  });
});

describe('phone number validation', () => {
  it('accepts international numbers', () => {
    expect(isValidPhoneNumber('+919876543210')).toBe(true);
    expect(isValidPhoneNumber('+14155552671')).toBe(true);
    expect(isValidPhoneNumber('  +442071838750  ')).toBe(true);
  });

  it('rejects a number with no country code', () => {
    // The gateway address is built from the digits, so a number without a
    // country code cannot be turned into one reliably.
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

  it('truncates an over-long message rather than letting the gateway split it', () => {
    const result = truncateForSms('a'.repeat(MAX_SMS_LENGTH + 200));
    expect(result).toHaveLength(MAX_SMS_LENGTH);
    expect(result.endsWith('...')).toBe(true);
  });

  it('keeps a message that is exactly at the limit', () => {
    const exact = 'b'.repeat(MAX_SMS_LENGTH);
    expect(truncateForSms(exact)).toBe(exact);
  });
});
