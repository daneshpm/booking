import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * The Prisma client is built lazily behind a Proxy so that importing the
 * database package does not require a reachable DATABASE_URL. Building it at
 * import time forced a placeholder URL into the production build and broke
 * every pure unit test that transitively touched the package.
 *
 * The connection string is never dialled here; only construction is exercised.
 */
describe('lazy prisma client', () => {
  const saved = process.env.DATABASE_URL;

  beforeAll(() => {
    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    if (saved === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = saved;
  });

  it('can be imported with no database URL set', async () => {
    // Construction is deferred, so the import itself must not throw.
    const mod = await import('@bookings/database');
    expect(mod.prisma).toBeDefined();
  });

  it('explains itself when used with no database URL', async () => {
    const { prisma } = await import('@bookings/database');
    // Touching a delegate is what triggers construction.
    expect(() => prisma.booking).toThrow(/DATABASE_URL is not set/);
  });

  it('forwards the surface the application uses once configured', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/unused';
    const { prisma } = await import('@bookings/database');

    expect(typeof prisma.booking).toBe('object');
    expect(typeof prisma.notificationLog).toBe('object');
    expect(typeof prisma.workflow).toBe('object');

    for (const method of ['$transaction', '$connect', '$disconnect', '$executeRawUnsafe']) {
      expect(typeof (prisma as unknown as Record<string, unknown>)[method]).toBe('function');
    }

    expect('$transaction' in prisma).toBe(true);
    expect('booking' in prisma).toBe(true);
  });
});
