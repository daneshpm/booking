import { describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from 'vitest';
import { prisma } from '@bookings/database';
import { __setHeader, __resetRequestContext } from './stubs/next-headers';
import { requestPasswordResetAction } from '../../app/reset-password/actions';
import { resetDatabase, createTenant, type TestTenant } from './helpers';

/**
 * Password reset must not leak who has an account.
 *
 * The reply is deliberately identical for a registered and an unregistered
 * address, which is worth nothing if the two take visibly different amounts
 * of time to arrive. The registered path used to await the SMTP round trip
 * inline while the unregistered path slept ~150 ms, so anyone could separate
 * customers from strangers with a stopwatch.
 *
 * SMTP here points at a black-holed address that accepts no connection. If
 * the send is ever awaited again, these requests inherit the connection
 * timeout and the assertions below fail on duration — which is the point.
 */
describe('password reset timing', () => {
  let tenant: TestTenant;
  const originalSmtpHost = process.env.SMTP_HOST;

  /** Well past the intended ~150 ms, far below any SMTP connection timeout. */
  const CEILING_MS = 3_000;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    __resetRequestContext();
  });

  beforeEach(async () => {
    await resetDatabase();
    __resetRequestContext();
    tenant = await createTenant('timing');

    // 203.0.113.0/24 is TEST-NET-3: reserved for documentation and routed
    // nowhere, so a connection attempt hangs rather than being refused.
    process.env.SMTP_HOST = '203.0.113.1';

    // The limiter keys on the caller address; a fixed one keeps these
    // requests from being throttled into the early neutral return, which
    // would make the timing assertion meaningless.
    __setHeader('x-forwarded-for', `198.51.100.${Math.floor(Math.random() * 250) + 1}`);
  });

  afterEach(() => {
    if (originalSmtpHost === undefined) delete process.env.SMTP_HOST;
    else process.env.SMTP_HOST = originalSmtpHost;
  });

  async function timeRequest(email: string): Promise<{ ms: number; success: boolean }> {
    const started = Date.now();
    const result = await requestPasswordResetAction(email);
    return { ms: Date.now() - started, success: result.success };
  }

  it('answers a registered address without waiting for the mail to send', async () => {
    const { ms, success } = await timeRequest(tenant.email);

    expect(success).toBe(true);
    expect(ms).toBeLessThan(CEILING_MS);
  });

  it('answers an unregistered address in comparable time', async () => {
    const { ms, success } = await timeRequest('definitely-not-registered@example.com');

    expect(success).toBe(true);
    expect(ms).toBeLessThan(CEILING_MS);
  });

  it('still issues a usable reset token for the registered address', async () => {
    // Not awaiting delivery must not mean skipping the token: the mail is
    // fire-and-forget, the credential it carries is not.
    await timeRequest(tenant.email);

    const tokens = await prisma.passwordResetToken.count({ where: { userId: tenant.userId } });
    expect(tokens).toBe(1);
  });

  it('issues no token for an address with no account', async () => {
    await timeRequest('definitely-not-registered@example.com');

    expect(await prisma.passwordResetToken.count()).toBe(0);
  });
});
