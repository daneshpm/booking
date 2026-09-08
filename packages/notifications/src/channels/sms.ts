import { sendMail, isMailConfigured } from './email';
import { notConfigured, type DeliveryResult } from './types';

/**
 * SMS delivery through an email-to-SMS gateway.
 *
 * Messages go out over the same SMTP transport as email: the number is turned
 * into an address at the gateway domain and handed to the mail server, which
 * relays it to the handset. That means no separate provider account, no HTTP
 * credentials, and one transport to configure and monitor.
 *
 * The tradeoffs are real and worth knowing. A gateway gives no delivery
 * receipt, so a message accepted by the mail server may still never arrive.
 * Carrier-run gateways need the recipient's carrier domain, so they only suit a
 * known audience; a bulk provider offering one domain for every network is the
 * better fit for customers whose carrier you do not know. Length limits are the
 * gateway's, not ours, and long messages may be split or truncated.
 *
 * With no gateway configured, delivery reports itself unconfigured rather than
 * throwing. The attempt is still recorded, so an operator can see a message was
 * due and why it did not go out.
 */

/**
 * Longest body sent to a gateway.
 *
 * A single GSM message is 160 characters; this allows a short multipart
 * message while keeping a reminder from turning into a wall of text.
 */
export const MAX_SMS_LENGTH = 480;

export interface SmsMessage {
  to: string;
  body: string;
}

/** Domain that turns an address into a text message, for example a provider's gateway. */
function gatewayDomain(): string | undefined {
  return process.env.SMS_GATEWAY_DOMAIN?.trim().replace(/^@/, '') || undefined;
}

/**
 * SMS needs both a mail transport and somewhere to send to, so it is only
 * available when SMTP is configured as well.
 */
export function isSmsConfigured(): boolean {
  return Boolean(gatewayDomain()) && isMailConfigured();
}

/**
 * Accept only a plausible E.164 number.
 *
 * The gateway address is derived from the digits, so a number without a country
 * code cannot be turned into one reliably.
 */
export function isValidPhoneNumber(value: string): boolean {
  return /^\+[1-9]\d{6,14}$/.test(value.trim());
}

/**
 * Build the gateway address for a number.
 *
 * Most gateways expect the digits alone. Set SMS_GATEWAY_STRIP_COUNTRY_CODE to
 * the country code, without the plus, for a carrier gateway that wants a
 * national number instead.
 */
export function gatewayAddressFor(phoneNumber: string, domain: string): string {
  let digits = phoneNumber.trim().replace(/[^\d]/g, '');

  const strip = process.env.SMS_GATEWAY_STRIP_COUNTRY_CODE?.trim().replace(/[^\d]/g, '');
  if (strip && digits.startsWith(strip)) {
    digits = digits.slice(strip.length);
  }

  return `${digits}@${domain}`;
}

/** Shorten a message so a gateway does not split or truncate it unpredictably. */
export function truncateForSms(body: string): string {
  const collapsed = body.replace(/\s*\n\s*/g, ' ').trim();
  return collapsed.length <= MAX_SMS_LENGTH
    ? collapsed
    : `${collapsed.slice(0, MAX_SMS_LENGTH - 3)}...`;
}

export async function sendSms(message: SmsMessage): Promise<DeliveryResult> {
  const domain = gatewayDomain();

  if (!domain) {
    return notConfigured('SMS delivery');
  }
  if (!isMailConfigured()) {
    return {
      delivered: false,
      error: 'SMS goes out over SMTP, which is not configured for this deployment',
    };
  }

  const to = message.to.trim();
  if (!isValidPhoneNumber(to)) {
    return {
      delivered: false,
      error: 'Recipient has no valid international phone number on file',
    };
  }

  // Many gateways prepend the subject to the message body, so it is left empty
  // unless a deployment's gateway needs something specific.
  const subject = process.env.SMS_GATEWAY_SUBJECT ?? '';

  const result = await sendMail({
    to: gatewayAddressFor(to, domain),
    subject,
    text: truncateForSms(message.body),
  });

  if (result.delivered) return result;

  return {
    delivered: false,
    error: result.error ? `SMS gateway: ${result.error}` : 'SMS gateway rejected the message',
  };
}
