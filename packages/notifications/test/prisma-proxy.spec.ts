import { describe, it, expect } from 'vitest';
import { prisma } from '@bookings/database';

/**
 * The client is built lazily behind a Proxy so that importing the database
 * package does not require a reachable DATABASE_URL. These check the proxy
 * forwards the surface the application actually uses.
 */
describe('lazy prisma client', () => {
  it('can be imported without a database URL', () => {
    // Construction is deferred, so the import above must not have thrown.
    expect(prisma).toBeDefined();
  });

  it('exposes the model delegates', () => {
    expect(typeof prisma.booking).toBe('object');
    expect(typeof prisma.notificationLog).toBe('object');
    expect(typeof prisma.workflow).toBe('object');
  });

  it('exposes the client methods the application calls', () => {
    for (const method of ['$transaction', '$connect', '$disconnect', '$executeRawUnsafe']) {
      expect(typeof (prisma as unknown as Record<string, unknown>)[method]).toBe('function');
    }
  });

  it('reports membership through the proxy', () => {
    expect('$transaction' in prisma).toBe(true);
    expect('booking' in prisma).toBe(true);
  });
});
