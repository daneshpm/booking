import { describeError, notConfigured, type DeliveryResult } from './types';

/**
 * SMS delivery through a Twilio-compatible HTTP API.
 *
 * Uses fetch against the REST endpoint rather than the vendor SDK, so the
 * dependency footprint stays small and any provider exposing the same shape
 * works by pointing SMS_API_BASE_URL at it.
 *
 * With no credentials configured, delivery reports itself unconfigured rather
 * than throwing. The attempt is still recorded, so an operator can see that a
 * message was due and why it did not go out.
 */

const DEFAULT_BASE_URL = 'https://api.twilio.com';

/** Longest single SMS body accepted, to avoid surprise multi-part billing. */
export const MAX_SMS_LENGTH = 480;

export interface SmsMessage {
  to: string;
  body: string;
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.SMS_ACCOUNT_SID && process.env.SMS_AUTH_TOKEN && process.env.SMS_FROM_NUMBER
  );
}

/**
 * Accept only a plausible E.164 number.
 *
 * Providers bill per attempt, so a malformed number is rejected before it costs
 * anything and the reason is recorded.
 */
export function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value.trim());
}

/** Shorten a message to one that will not be split into several parts. */
export function truncateForSms(body: string): string {
  const collapsed = body.replace(/\s*\n\s*/g, ' ').trim();
  return collapsed.length <= MAX_SMS_LENGTH
    ? collapsed
    : `${collapsed.slice(0, MAX_SMS_LENGTH - 3)}...`;
}

export async function sendSms(message: SmsMessage): Promise<DeliveryResult> {
  if (!isSmsConfigured()) {
    return notConfigured('SMS delivery');
  }

  const to = message.to.trim();
  if (!isValidPhoneNumber(to)) {
    return {
      delivered: false,
      error: 'Recipient has no valid international phone number on file',
    };
  }

  const accountSid = process.env.SMS_ACCOUNT_SID!;
  const authToken = process.env.SMS_AUTH_TOKEN!;
  const from = process.env.SMS_FROM_NUMBER!;
  const baseUrl = (process.env.SMS_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

  const url = `${baseUrl}/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: truncateForSms(message.body) }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      // The provider echoes the request back on some errors, so only the status
      // and its own message are kept out of the response body.
      let providerMessage = `HTTP ${response.status}`;
      try {
        const parsed = JSON.parse(detail) as { message?: string };
        if (parsed.message) providerMessage = `${providerMessage}: ${parsed.message}`;
      } catch {
        /* body was not JSON; the status alone is enough */
      }
      return { delivered: false, error: providerMessage };
    }

    const payload = (await response.json().catch(() => ({}))) as { sid?: string };
    return { delivered: true, providerId: payload.sid };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { delivered: false, error: 'SMS provider timed out after 15 seconds' };
    }
    return { delivered: false, error: describeError(err, 'SMS provider unreachable') };
  } finally {
    clearTimeout(timeout);
  }
}
