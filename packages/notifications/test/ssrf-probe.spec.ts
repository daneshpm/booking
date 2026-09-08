import { describe, it, expect } from 'vitest';
import { assertDeliverableTarget } from '../src/channels/webhook';

/**
 * Alternative encodings of loopback and of the cloud metadata address.
 *
 * These are the classic ways past a naive address filter: a filter that only
 * string-matches "127.0.0.1" lets every one of them through. The webhook
 * destination is supplied by a workspace administrator, so each must be
 * refused before any request is made.
 */
const LOOPBACK_ENCODINGS = [
  ['decimal', 'https://2130706433/hook'],
  ['octal', 'https://0177.0.0.1/hook'],
  ['hexadecimal', 'https://0x7f.0x0.0x0.0x1/hook'],
  ['short form', 'https://127.1/hook'],
  ['hostname', 'https://localhost/hook'],
  ['hostname with a trailing dot', 'https://localhost./hook'],
  ['IPv6 literal', 'https://[::1]/hook'],
  ['IPv4-mapped IPv6', 'https://[::ffff:127.0.0.1]/hook'],
  ['bare zero', 'https://0/hook'],
] as const;

const METADATA_ENCODINGS = [
  ['dotted quad', 'https://169.254.169.254/latest/meta-data/'],
  ['decimal', 'https://2852039166/latest/meta-data/'],
  ['IPv4-mapped IPv6', 'https://[::ffff:169.254.169.254]/latest/meta-data/'],
] as const;

describe('webhook target filtering resists encoding tricks', () => {
  for (const [label, url] of LOOPBACK_ENCODINGS) {
    it(`refuses loopback as ${label}`, async () => {
      await expect(assertDeliverableTarget(url)).rejects.toThrow();
    });
  }

  for (const [label, url] of METADATA_ENCODINGS) {
    it(`refuses the cloud metadata address as ${label}`, async () => {
      // This endpoint hands back instance credentials to anything that can make
      // the server fetch it, so it is the highest-value target of the lot.
      await expect(assertDeliverableTarget(url)).rejects.toThrow();
    });
  }

  it('refuses a private range reached by hostname', async () => {
    await expect(assertDeliverableTarget('https://192.168.0.1/hook')).rejects.toThrow();
  });
});
