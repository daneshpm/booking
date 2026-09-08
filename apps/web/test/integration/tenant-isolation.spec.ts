import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import {
  resolveSession,
  resolveWorkspaceAccess,
  destroySession,
  destroyAllUserSessions,
  purgeExpiredSessions,
  AuthorizationError,
  hashSessionToken,
} from '@bookings/auth';
import { resetDatabase, createTenant, type TestTenant } from './helpers';

/**
 * Tenant isolation and session lifecycle against a real database.
 *
 * The guard is what stands between two customers' data, so it is exercised
 * with genuine rows rather than a stubbed session object.
 */
describe('session resolution and tenant isolation', () => {
  let alpha: TestTenant;
  let beta: TestTenant;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    alpha = await createTenant('alpha');
    beta = await createTenant('beta');
  });

  it('resolves a valid session to its own user and workspace', async () => {
    const session = await resolveSession(alpha.sessionToken);
    expect(session).not.toBeNull();
    expect(session!.user.id).toBe(alpha.userId);
    expect(session!.workspaces.map((w) => w.id)).toEqual([alpha.workspaceId]);
  });

  it('never exposes another tenant workspace on a session', async () => {
    const session = await resolveSession(alpha.sessionToken);
    expect(session!.workspaces.map((w) => w.id)).not.toContain(beta.workspaceId);
  });

  it('rejects an unknown token', async () => {
    await expect(resolveSession('not-a-real-token')).resolves.toBeNull();
  });

  it('rejects a missing token', async () => {
    await expect(resolveSession(undefined)).resolves.toBeNull();
    await expect(resolveSession(null)).resolves.toBeNull();
  });

  it('stores only the token digest, never the token', async () => {
    const stored = await prisma.session.findFirst({ where: { userId: alpha.userId } });
    expect(stored).not.toBeNull();
    expect(stored!.tokenHash).toBe(hashSessionToken(alpha.sessionToken));
    expect(stored!.tokenHash).not.toContain(alpha.sessionToken);
  });

  it('refuses a workspace id belonging to another tenant', async () => {
    const session = await resolveSession(alpha.sessionToken);

    // The exact attack the guard exists to stop: a signed-in user submitting
    // someone else's workspace id.
    expect(() => resolveWorkspaceAccess(session, beta.workspaceId)).toThrow(AuthorizationError);
    try {
      resolveWorkspaceAccess(session, beta.workspaceId);
    } catch (err) {
      expect((err as AuthorizationError).code).toBe('FORBIDDEN');
    }
  });

  it('allows a workspace id the session does own', () => {
    return resolveSession(alpha.sessionToken).then((session) => {
      expect(resolveWorkspaceAccess(session, alpha.workspaceId).id).toBe(alpha.workspaceId);
    });
  });

  it('expires a session past its expiry and deletes the row', async () => {
    await prisma.session.updateMany({
      where: { userId: alpha.userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(resolveSession(alpha.sessionToken)).resolves.toBeNull();

    const remaining = await prisma.session.count({ where: { userId: alpha.userId } });
    expect(remaining).toBe(0);
  });

  it('stops honouring sessions once the account is deactivated', async () => {
    await prisma.user.update({ where: { id: alpha.userId }, data: { isActive: false } });

    await expect(resolveSession(alpha.sessionToken)).resolves.toBeNull();

    // Every session for that account is dropped, not just the one presented.
    const remaining = await prisma.session.count({ where: { userId: alpha.userId } });
    expect(remaining).toBe(0);
  });

  it('revokes a single session without touching others', async () => {
    const second = await createTenant('alpha-second');
    await destroySession(alpha.sessionToken);

    await expect(resolveSession(alpha.sessionToken)).resolves.toBeNull();
    await expect(resolveSession(second.sessionToken)).resolves.not.toBeNull();
  });

  it('revokes every session for one user', async () => {
    const { createSession } = await import('@bookings/auth');
    const extra = await createSession({ userId: alpha.userId });

    const removed = await destroyAllUserSessions(alpha.userId);
    expect(removed).toBeGreaterThanOrEqual(2);

    await expect(resolveSession(alpha.sessionToken)).resolves.toBeNull();
    await expect(resolveSession(extra.token)).resolves.toBeNull();
    // Another user's session is untouched.
    await expect(resolveSession(beta.sessionToken)).resolves.not.toBeNull();
  });

  it('purges only expired sessions', async () => {
    await prisma.session.updateMany({
      where: { userId: alpha.userId },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const purged = await purgeExpiredSessions();
    expect(purged).toBe(1);
    await expect(resolveSession(beta.sessionToken)).resolves.not.toBeNull();
  });

  it('deletes sessions when the user row is deleted', async () => {
    await prisma.user.delete({ where: { id: alpha.userId } });
    const remaining = await prisma.session.count({ where: { userId: alpha.userId } });
    expect(remaining).toBe(0);
  });
});

describe('role enforcement', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('lets an owner through an admin-only check', async () => {
    const tenant = await createTenant('owner', { role: 'OWNER' });
    const session = await resolveSession(tenant.sessionToken);
    expect(() => resolveWorkspaceAccess(session, tenant.workspaceId, 'ADMIN')).not.toThrow();
  });

  it('blocks a receptionist from an admin-only action', async () => {
    const tenant = await createTenant('desk', { role: 'RECEPTIONIST' });
    const session = await resolveSession(tenant.sessionToken);

    expect(() => resolveWorkspaceAccess(session, tenant.workspaceId, 'ADMIN')).toThrow(
      AuthorizationError
    );
    // The same person can still perform their own lower-privilege work.
    expect(() => resolveWorkspaceAccess(session, tenant.workspaceId, 'RECEPTIONIST')).not.toThrow();
  });

  it('blocks a staff member from an admin-only action', async () => {
    const tenant = await createTenant('member', { role: 'STAFF' });
    const session = await resolveSession(tenant.sessionToken);
    expect(() => resolveWorkspaceAccess(session, tenant.workspaceId, 'ADMIN')).toThrow(
      AuthorizationError
    );
  });
});
