import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import {
  createPasswordResetToken,
  resolvePasswordResetToken,
  consumePasswordResetToken,
  purgeExpiredResetTokens,
  hashPassword,
  verifyPassword,
  createSession,
  resolveSession,
  hashSessionToken,
} from '@bookings/auth';
import { resetDatabase, createTenant, type TestTenant } from './helpers';

/**
 * Password reset against a real database.
 *
 * A reset link is a credential: it must be single use, short lived, and it must
 * invalidate the sessions of an account that may already be compromised.
 */
describe('password reset', () => {
  let tenant: TestTenant;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    tenant = await createTenant('reset');
  });

  it('issues a token that resolves to its owner', async () => {
    const { token } = await createPasswordResetToken(tenant.userId);
    const resolved = await resolvePasswordResetToken(token);
    expect(resolved?.userId).toBe(tenant.userId);
  });

  it('stores only the digest, never the token', async () => {
    const { token } = await createPasswordResetToken(tenant.userId);
    const row = await prisma.passwordResetToken.findFirstOrThrow({
      where: { userId: tenant.userId },
    });
    expect(row.tokenHash).toBe(hashSessionToken(token));
    expect(row.tokenHash).not.toContain(token);
  });

  it('rejects an unknown token', async () => {
    await expect(resolvePasswordResetToken('not-a-real-token')).resolves.toBeNull();
    await expect(resolvePasswordResetToken(undefined)).resolves.toBeNull();
  });

  it('rejects an expired token', async () => {
    const { token } = await createPasswordResetToken(tenant.userId);
    await prisma.passwordResetToken.updateMany({
      where: { userId: tenant.userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expect(resolvePasswordResetToken(token)).resolves.toBeNull();
  });

  it('invalidates an earlier link when a new one is requested', async () => {
    // A link sent to an address the owner no longer controls must stop working.
    const first = await createPasswordResetToken(tenant.userId);
    await createPasswordResetToken(tenant.userId);
    await expect(resolvePasswordResetToken(first.token)).resolves.toBeNull();
  });

  it('changes the password and burns the token', async () => {
    const { token } = await createPasswordResetToken(tenant.userId);
    const resolved = await resolvePasswordResetToken(token);

    const applied = await consumePasswordResetToken(
      resolved!.id,
      tenant.userId,
      await hashPassword('Br4ndNewPassphrase')
    );
    expect(applied).toBe(true);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: tenant.userId } });
    await expect(verifyPassword('Br4ndNewPassphrase', user.passwordHash)).resolves.toBe(true);
    await expect(verifyPassword('Str0ngPassphrase', user.passwordHash)).resolves.toBe(false);

    await expect(resolvePasswordResetToken(token)).resolves.toBeNull();
  });

  it('cannot be used twice', async () => {
    const { token } = await createPasswordResetToken(tenant.userId);
    const resolved = await resolvePasswordResetToken(token);

    const first = await consumePasswordResetToken(
      resolved!.id,
      tenant.userId,
      await hashPassword('FirstNewPassphrase1')
    );
    const second = await consumePasswordResetToken(
      resolved!.id,
      tenant.userId,
      await hashPassword('SecondNewPassphrase1')
    );

    expect(first).toBe(true);
    expect(second).toBe(false);

    // The second attempt must not have taken effect.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: tenant.userId } });
    await expect(verifyPassword('FirstNewPassphrase1', user.passwordHash)).resolves.toBe(true);
  });

  it('lets exactly one of two concurrent uses win', async () => {
    const { token } = await createPasswordResetToken(tenant.userId);
    const resolved = await resolvePasswordResetToken(token);

    const results = await Promise.all([
      consumePasswordResetToken(resolved!.id, tenant.userId, await hashPassword('RaceOnePass1')),
      consumePasswordResetToken(resolved!.id, tenant.userId, await hashPassword('RaceTwoPass1')),
    ]);

    expect(results.filter(Boolean)).toHaveLength(1);
  });

  it('signs out every existing session', async () => {
    // The account may already be compromised, so a reset must not leave the
    // attacker's session alive.
    const attacker = await createSession({ userId: tenant.userId });
    await expect(resolveSession(attacker.token)).resolves.not.toBeNull();

    const { token } = await createPasswordResetToken(tenant.userId);
    const resolved = await resolvePasswordResetToken(token);
    await consumePasswordResetToken(
      resolved!.id,
      tenant.userId,
      await hashPassword('AfterResetPass1')
    );

    await expect(resolveSession(attacker.token)).resolves.toBeNull();
    await expect(resolveSession(tenant.sessionToken)).resolves.toBeNull();
  });

  it('does not disturb another user sessions', async () => {
    const other = await createTenant('other-reset');

    const { token } = await createPasswordResetToken(tenant.userId);
    const resolved = await resolvePasswordResetToken(token);
    await consumePasswordResetToken(
      resolved!.id,
      tenant.userId,
      await hashPassword('OnlyMinePass1')
    );

    await expect(resolveSession(other.sessionToken)).resolves.not.toBeNull();
  });

  it('purges spent and expired tokens', async () => {
    await createPasswordResetToken(tenant.userId);
    await prisma.passwordResetToken.updateMany({
      where: { userId: tenant.userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const other = await createTenant('keep-reset');
    await createPasswordResetToken(other.userId);

    const removed = await purgeExpiredResetTokens();
    expect(removed).toBe(1);
    expect(await prisma.passwordResetToken.count()).toBe(1);
  });

  it('removes tokens when the account is deleted', async () => {
    await createPasswordResetToken(tenant.userId);
    await prisma.user.delete({ where: { id: tenant.userId } });
    expect(await prisma.passwordResetToken.count({ where: { userId: tenant.userId } })).toBe(0);
  });
});
