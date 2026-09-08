import { createHmac, timingSafeEqual } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { describeError, type DeliveryResult } from './types';

/**
 * Webhook delivery.
 *
 * The destination URL is supplied by a workspace administrator, which makes
 * this a server-side request forgery surface: left unguarded it would let a
 * tenant aim the server at cloud metadata endpoints or at services reachable
 * only from inside the network. Every destination is therefore resolved and
 * checked against private address ranges before the request is made, and
 * redirects are refused so a public URL cannot bounce to a private one.
 *
 * The residual risk is DNS rebinding: a hostname that resolves to a public
 * address during validation and to a private one when the socket is opened.
 * Closing that gap fully requires pinning the connection to the validated
 * address, which Node's fetch does not expose. For deployments where that
 * matters, route outbound webhooks through an egress proxy.
 */

/** Requests are abandoned after this long. */
const TIMEOUT_MS = 10_000;

/** Response bodies beyond this are ignored; only the status matters. */
const MAX_RESPONSE_BYTES = 4096;

export interface WebhookPayload {
  event: string;
  workspaceId: string;
  bookingId?: string;
  occurredAt: string;
  data: Record<string, unknown>;
}

export class WebhookTargetError extends Error {}

/**
 * Reject addresses that are not routable on the public internet.
 *
 * Covers loopback, private ranges, link-local (which includes the cloud
 * metadata address 169.254.169.254), carrier-grade NAT, and the IPv6
 * equivalents.
 */
export function isBlockedAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 0) return true;

  if (version === 4) {
    const parts = address.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts;

    if (a === 0) return true; // "this network"
    if (a === 10) return true; // private
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local, cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
    if (a === 192 && b === 0) return true; // IETF protocol assignments
    if (a >= 224) return true; // multicast and reserved
    return false;
  }

  const normalised = address.toLowerCase().split('%')[0];
  if (normalised === '::' || normalised === '::1') return true; // unspecified, loopback
  if (normalised.startsWith('fe80')) return true; // link-local
  if (/^f[cd]/.test(normalised)) return true; // unique local
  if (normalised.startsWith('ff')) return true; // multicast
  // IPv4-mapped IPv6, for example ::ffff:127.0.0.1
  const mapped = normalised.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedAddress(mapped[1]);
  return false;
}

/**
 * Validate a destination and resolve it to an address.
 *
 * Throws WebhookTargetError with a message safe to show an administrator, so
 * they can see why their URL was refused.
 */
export async function assertDeliverableTarget(rawUrl: string): Promise<void> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new WebhookTargetError('Webhook URL is not a valid URL');
  }

  const allowInsecure = process.env.WEBHOOK_ALLOW_INSECURE === 'true';
  if (url.protocol !== 'https:' && !(allowInsecure && url.protocol === 'http:')) {
    throw new WebhookTargetError('Webhook URL must use https');
  }

  if (url.username || url.password) {
    throw new WebhookTargetError('Webhook URL must not embed credentials');
  }

  // A literal address skips DNS but is checked the same way.
  if (isIP(url.hostname)) {
    if (isBlockedAddress(url.hostname)) {
      throw new WebhookTargetError('Webhook URL points at a private or reserved address');
    }
    return;
  }

  let resolved: Array<{ address: string }>;
  try {
    resolved = await lookup(url.hostname, { all: true });
  } catch {
    throw new WebhookTargetError('Webhook host could not be resolved');
  }

  if (resolved.length === 0) {
    throw new WebhookTargetError('Webhook host could not be resolved');
  }

  // Every resolved address must be public: one private answer is enough for an
  // attacker to be routed there.
  for (const entry of resolved) {
    if (isBlockedAddress(entry.address)) {
      throw new WebhookTargetError('Webhook URL resolves to a private or reserved address');
    }
  }
}

/**
 * Signature header value for a payload.
 *
 * Format is `t=<unix seconds>,v1=<hex hmac>` over `<timestamp>.<body>`. The
 * timestamp is inside the signed material so a captured request cannot be
 * replayed later with a fresh timestamp.
 */
export function signPayload(body: string, secret: string, timestampSeconds: number): string {
  const signature = createHmac('sha256', secret)
    .update(`${timestampSeconds}.${body}`)
    .digest('hex');
  return `t=${timestampSeconds},v1=${signature}`;
}

/**
 * Verify a signature header. Provided so receivers, and the tests, can check
 * the scheme without reimplementing it.
 */
export function verifySignature(
  body: string,
  secret: string,
  header: string,
  toleranceSeconds = 300,
  now = Math.floor(Date.now() / 1000)
): boolean {
  const parts = Object.fromEntries(
    header.split(',').map((piece) => {
      const [key, ...rest] = piece.trim().split('=');
      return [key, rest.join('=')];
    })
  );

  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(now - timestamp) > toleranceSeconds) return false;
  if (typeof parts.v1 !== 'string' || parts.v1.length === 0) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(parts.v1, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function sendWebhook(url: string, payload: WebhookPayload): Promise<DeliveryResult> {
  try {
    await assertDeliverableTarget(url);
  } catch (err) {
    if (err instanceof WebhookTargetError) {
      return { delivered: false, error: err.message };
    }
    return { delivered: false, error: describeError(err, 'Webhook target rejected') };
  }

  const body = JSON.stringify(payload);
  const secret = process.env.WEBHOOK_SIGNING_SECRET;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'RoomanBookings-Webhook/1.0',
    'X-Rooman-Event': payload.event,
  };

  // Unsigned webhooks let anyone who learns the URL forge events, so the
  // receiver is told explicitly when no secret is configured rather than being
  // left to assume the request is authenticated.
  if (secret) {
    headers['X-Rooman-Signature'] = signPayload(body, secret, Math.floor(Date.now() / 1000));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      // A validated public URL must not be able to redirect the request to a
      // private address after the check has passed.
      redirect: 'manual',
      signal: controller.signal,
    });

    if (response.status >= 300 && response.status < 400) {
      return { delivered: false, error: 'Webhook endpoint redirected; redirects are not followed' };
    }

    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, MAX_RESPONSE_BYTES);
      return {
        delivered: false,
        error: detail
          ? `HTTP ${response.status}: ${detail.slice(0, 200)}`
          : `HTTP ${response.status}`,
      };
    }

    return { delivered: true };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { delivered: false, error: `Webhook timed out after ${TIMEOUT_MS / 1000} seconds` };
    }
    return { delivered: false, error: describeError(err, 'Webhook endpoint unreachable') };
  } finally {
    clearTimeout(timeout);
  }
}
