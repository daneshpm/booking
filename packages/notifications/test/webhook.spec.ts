import { describe, it, expect } from 'vitest';
import {
  isBlockedAddress,
  assertDeliverableTarget,
  signPayload,
  verifySignature,
  WebhookTargetError,
} from '../src/channels/webhook';

describe('address filtering', () => {
  it('blocks loopback', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true);
    expect(isBlockedAddress('127.255.255.254')).toBe(true);
    expect(isBlockedAddress('::1')).toBe(true);
  });

  it('blocks the cloud metadata address', () => {
    // The single most valuable server-side request forgery target: it hands
    // back instance credentials to anyone who can make the server fetch it.
    expect(isBlockedAddress('169.254.169.254')).toBe(true);
  });

  it('blocks private ranges', () => {
    expect(isBlockedAddress('10.0.0.1')).toBe(true);
    expect(isBlockedAddress('172.16.0.1')).toBe(true);
    expect(isBlockedAddress('172.31.255.255')).toBe(true);
    expect(isBlockedAddress('192.168.1.1')).toBe(true);
  });

  it('allows public addresses that merely look similar', () => {
    expect(isBlockedAddress('172.32.0.1')).toBe(false);
    expect(isBlockedAddress('172.15.0.1')).toBe(false);
    expect(isBlockedAddress('192.169.1.1')).toBe(false);
    expect(isBlockedAddress('11.0.0.1')).toBe(false);
  });

  it('blocks carrier-grade NAT and reserved space', () => {
    expect(isBlockedAddress('100.64.0.1')).toBe(true);
    expect(isBlockedAddress('0.0.0.0')).toBe(true);
    expect(isBlockedAddress('224.0.0.1')).toBe(true);
  });

  it('blocks IPv6 private and link-local ranges', () => {
    expect(isBlockedAddress('fe80::1')).toBe(true);
    expect(isBlockedAddress('fc00::1')).toBe(true);
    expect(isBlockedAddress('fd00::1')).toBe(true);
    expect(isBlockedAddress('ff02::1')).toBe(true);
  });

  it('blocks an IPv4-mapped IPv6 address that wraps a private one', () => {
    // Without unwrapping, ::ffff:127.0.0.1 walks straight past an IPv4-only check.
    expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedAddress('::ffff:169.254.169.254')).toBe(true);
  });

  it('allows ordinary public addresses', () => {
    expect(isBlockedAddress('8.8.8.8')).toBe(false);
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false);
  });

  it('blocks anything that is not an address at all', () => {
    expect(isBlockedAddress('not-an-address')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
  });
});

describe('target validation', () => {
  it('refuses a non-https URL by default', async () => {
    await expect(assertDeliverableTarget('http://example.com/hook')).rejects.toBeInstanceOf(
      WebhookTargetError
    );
  });

  it('refuses a URL that is not a URL', async () => {
    await expect(assertDeliverableTarget('not a url')).rejects.toBeInstanceOf(WebhookTargetError);
  });

  it('refuses a URL with embedded credentials', async () => {
    await expect(
      assertDeliverableTarget('https://user:pass@example.com/hook')
    ).rejects.toBeInstanceOf(WebhookTargetError);
  });

  it('refuses a literal private address without a DNS lookup', async () => {
    await expect(assertDeliverableTarget('https://127.0.0.1/hook')).rejects.toThrow(
      /private or reserved/
    );
    await expect(
      assertDeliverableTarget('https://169.254.169.254/latest/meta-data/')
    ).rejects.toThrow(/private or reserved/);
  });

  it('refuses a hostname that cannot be resolved', async () => {
    await expect(
      assertDeliverableTarget('https://this-host-should-not-exist-9f3a2b.invalid/hook')
    ).rejects.toThrow(/could not be resolved/);
  });

  it('accepts a literal public address', async () => {
    await expect(assertDeliverableTarget('https://8.8.8.8/hook')).resolves.toBeUndefined();
  });
});

describe('payload signing', () => {
  const secret = 'test-signing-secret';
  const body = JSON.stringify({ event: 'BOOKING_CREATED', id: 'abc' });

  it('produces the documented header format', () => {
    const header = signPayload(body, secret, 1_700_000_000);
    expect(header).toMatch(/^t=1700000000,v1=[0-9a-f]{64}$/);
  });

  it('verifies its own signature', () => {
    const now = 1_700_000_000;
    expect(verifySignature(body, secret, signPayload(body, secret, now), 300, now)).toBe(true);
  });

  it('rejects a signature made with a different secret', () => {
    const now = 1_700_000_000;
    const header = signPayload(body, 'other-secret', now);
    expect(verifySignature(body, secret, header, 300, now)).toBe(false);
  });

  it('rejects a signature over different content', () => {
    const now = 1_700_000_000;
    const header = signPayload(body, secret, now);
    expect(verifySignature('{"tampered":true}', secret, header, 300, now)).toBe(false);
  });

  it('rejects a captured signature replayed later', () => {
    // The timestamp is inside the signed material, so an old request cannot be
    // re-sent with a fresh one.
    const signedAt = 1_700_000_000;
    const header = signPayload(body, secret, signedAt);
    expect(verifySignature(body, secret, header, 300, signedAt + 3600)).toBe(false);
  });

  it('rejects a malformed header', () => {
    const now = 1_700_000_000;
    expect(verifySignature(body, secret, 'garbage', 300, now)).toBe(false);
    expect(verifySignature(body, secret, 't=abc,v1=def', 300, now)).toBe(false);
    expect(verifySignature(body, secret, `t=${now}`, 300, now)).toBe(false);
  });
});
