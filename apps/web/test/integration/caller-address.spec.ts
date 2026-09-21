import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { __setHeader, __resetRequestContext } from './stubs/next-headers';
import { callerAddress } from '../../lib/rate-limit';

/**
 * Which hop of X-Forwarded-For the rate limiter believes.
 *
 * The header is a list, oldest first, and only the entries our own proxy
 * appended can be trusted — everything to the left of those came from the
 * caller. Reading the leftmost entry let anyone rotate it per request and
 * be counted as a new address every time, which silently defeats every
 * limit built on top of it.
 *
 * Lives in the integration suite rather than the unit one because it needs
 * the next/headers stub that only that config aliases.
 */
describe('caller address resolution', () => {
  beforeEach(() => {
    __resetRequestContext();
  });

  afterAll(() => {
    __resetRequestContext();
  });

  it('believes the rightmost hop, which is the one our proxy appended', async () => {
    // nginx with $proxy_add_x_forwarded_for: the caller pre-loaded a fake
    // address, nginx appended what it actually saw.
    __setHeader('x-forwarded-for', '1.2.3.4, 203.0.113.7');

    expect(await callerAddress()).toBe('203.0.113.7');
  });

  it('is not fooled by a caller stuffing the header with many hops', async () => {
    __setHeader('x-forwarded-for', 'evil-1, evil-2, evil-3, 203.0.113.7');

    expect(await callerAddress()).toBe('203.0.113.7');
  });

  it('handles the single-entry form nginx produces when it replaces the header', async () => {
    // proxy_set_header X-Forwarded-For $remote_addr
    __setHeader('x-forwarded-for', '203.0.113.7');

    expect(await callerAddress()).toBe('203.0.113.7');
  });

  it('tolerates the whitespace real proxies leave behind', async () => {
    __setHeader('x-forwarded-for', '  1.2.3.4 ,   203.0.113.7  ');

    expect(await callerAddress()).toBe('203.0.113.7');
  });

  it('ignores empty entries rather than attributing the request to nothing', async () => {
    __setHeader('x-forwarded-for', '1.2.3.4, ,');

    expect(await callerAddress()).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip when no forwarded header is present', async () => {
    __setHeader('x-real-ip', '203.0.113.9');

    expect(await callerAddress()).toBe('203.0.113.9');
  });

  it('reports a stable placeholder when the request carries neither header', async () => {
    // Everything unattributable shares one bucket, which is the safe
    // direction: it over-throttles rather than letting requests through
    // uncounted.
    expect(await callerAddress()).toBe('unknown');
  });

  it('gives two callers behind the same proxy different keys', async () => {
    __setHeader('x-forwarded-for', 'spoofed, 203.0.113.7');
    const first = await callerAddress();

    __resetRequestContext();
    __setHeader('x-forwarded-for', 'spoofed, 203.0.113.8');
    const second = await callerAddress();

    expect(first).not.toBe(second);
  });

  it('gives one caller the same key however they rewrite the left of the header', async () => {
    // The actual attack: same client, a fresh fake hop each request, hoping
    // for a fresh rate-limit bucket each time.
    __setHeader('x-forwarded-for', 'fake-a, 203.0.113.7');
    const first = await callerAddress();

    __resetRequestContext();
    __setHeader('x-forwarded-for', 'fake-b, 203.0.113.7');
    const second = await callerAddress();

    expect(first).toBe(second);
  });
});
