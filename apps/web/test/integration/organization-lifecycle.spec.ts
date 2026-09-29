import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { createSession, resolveSession } from '@bookings/auth';
import { hashPassword } from '@bookings/core';
import { __setCookie, __resetRequestContext } from './stubs/next-headers';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

import {
  setOrganizationActiveAction,
  updateBillingStatusAction,
} from '../../app/super-admin/actions';

/**
 * Soft-delete and manual billing toggle, both platform-admin only.
 *
 * A workspace that is deactivated must vanish from its own members' sessions
 * (so requireWorkspace naturally treats it as no-access, with no new code
 * path to get wrong) while every underlying row stays untouched.
 */
describe('organization lifecycle (deactivation & billing)', () => {
  let tenant: TestTenant;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    await __resetRateLimits();
    __resetRequestContext();
    tenant = await createTenant('lifecycle');
  });

  async function platformAdminSession(): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}@example.com`,
        name: 'Platform Admin',
        passwordHash: await hashPassword('Str0ngPassphrase'),
        isPlatformAdmin: true,
      },
    });
    const { token } = await createSession({ userId: user.id });
    return token;
  }

  it('refuses to deactivate an organization when the caller is not a platform admin', async () => {
    __setCookie('rb_session', tenant.sessionToken);

    const result = await setOrganizationActiveAction(tenant.workspaceId, false);

    expect(result.success).toBe(false);
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: tenant.workspaceId },
    });
    expect(workspace.isActive).toBe(true);
  });

  it('lets a platform admin deactivate an organization without touching its rows', async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);

    const result = await setOrganizationActiveAction(tenant.workspaceId, false);
    expect(result.success).toBe(true);

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: tenant.workspaceId },
    });
    expect(workspace.isActive).toBe(false);

    // Soft delete: the owner's staff profile and service are untouched.
    const staff = await prisma.staff.findUnique({ where: { id: tenant.staffId } });
    const service = await prisma.service.findUnique({ where: { id: tenant.serviceId } });
    expect(staff).not.toBeNull();
    expect(service).not.toBeNull();
  });

  it('drops a deactivated workspace out of its member session, without killing the session itself', async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);
    await setOrganizationActiveAction(tenant.workspaceId, false);

    const session = await resolveSession(tenant.sessionToken);

    expect(session).not.toBeNull();
    expect(session?.workspaces.some((w) => w.id === tenant.workspaceId)).toBe(false);
  });

  it('restores a deactivated workspace to its member session on reactivation', async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);
    await setOrganizationActiveAction(tenant.workspaceId, false);
    await setOrganizationActiveAction(tenant.workspaceId, true);

    const session = await resolveSession(tenant.sessionToken);

    expect(session?.workspaces.some((w) => w.id === tenant.workspaceId)).toBe(true);
  });

  it('refuses to change billing status when the caller is not a platform admin', async () => {
    __setCookie('rb_session', tenant.sessionToken);

    const result = await updateBillingStatusAction(tenant.workspaceId, 'SUBSCRIBED');

    expect(result.success).toBe(false);
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: tenant.workspaceId },
    });
    expect(workspace.billingStatus).toBe('TRIAL');
  });

  it('lets a platform admin mark an organization Subscribed, clearing its trial end date', async () => {
    await prisma.workspace.update({
      where: { id: tenant.workspaceId },
      data: { trialEndsAt: new Date() },
    });
    const token = await platformAdminSession();
    __setCookie('rb_session', token);

    const result = await updateBillingStatusAction(tenant.workspaceId, 'SUBSCRIBED');
    expect(result.success).toBe(true);

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: tenant.workspaceId },
    });
    expect(workspace.billingStatus).toBe('SUBSCRIBED');
    expect(workspace.trialEndsAt).toBeNull();
  });
});
