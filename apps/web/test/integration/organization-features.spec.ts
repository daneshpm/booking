import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { createSession } from '@bookings/auth';
import { hashPassword } from '@bookings/core';
import { __setCookie, __resetRequestContext } from './stubs/next-headers';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

import { updateOrganizationFeatureAction } from '../../app/super-admin/actions';
import { createWorkflowAction } from '../../app/(dashboard)/workflows/actions';
import { exportAppointmentsAction } from '../../app/(dashboard)/export/actions';
import { updateBookingPageBrandingAction } from '../../app/(dashboard)/booking-pages/actions';

/**
 * Per-organization feature toggles (Workflows, Analytics, Data export,
 * Booking pages), set by a platform admin.
 *
 * "Hide + block": the nav link disappearing (DashboardShell, not covered
 * here — see TESTING.md) is a courtesy. requireWorkspaceFeature() refusing
 * the underlying action even when called directly is what actually matters,
 * which is what these tests exercise.
 */
describe('per-organization feature toggles', () => {
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
    tenant = await createTenant('features');
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

  it('refuses to change a feature flag when the caller is not a platform admin', async () => {
    __setCookie('rb_session', tenant.sessionToken);

    const result = await updateOrganizationFeatureAction(
      tenant.workspaceId,
      'workflowsEnabled',
      false
    );

    expect(result.success).toBe(false);
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: tenant.workspaceId },
    });
    expect(workspace.workflowsEnabled).toBe(true);
  });

  it('lets a platform admin turn a feature off and on', async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);

    const off = await updateOrganizationFeatureAction(
      tenant.workspaceId,
      'workflowsEnabled',
      false
    );
    expect(off.success).toBe(true);
    expect(
      (await prisma.workspace.findUniqueOrThrow({ where: { id: tenant.workspaceId } }))
        .workflowsEnabled
    ).toBe(false);

    const on = await updateOrganizationFeatureAction(tenant.workspaceId, 'workflowsEnabled', true);
    expect(on.success).toBe(true);
    expect(
      (await prisma.workspace.findUniqueOrThrow({ where: { id: tenant.workspaceId } }))
        .workflowsEnabled
    ).toBe(true);
  });

  it('blocks creating a workflow once Workflows is disabled for the organization, even for its own owner', async () => {
    await prisma.workspace.update({
      where: { id: tenant.workspaceId },
      data: { workflowsEnabled: false },
    });
    __setCookie('rb_session', tenant.sessionToken);

    const result = await createWorkflowAction(tenant.workspaceId, {
      name: 'Reminder',
      trigger: 'BOOKING_CREATED',
      channel: 'EMAIL',
      recipient: 'CUSTOMER',
    });

    expect(result.success).toBe(false);
    expect(await prisma.workflow.count({ where: { workspaceId: tenant.workspaceId } })).toBe(0);
  });

  it('blocks exporting appointments once Data export is disabled for the organization', async () => {
    await prisma.workspace.update({
      where: { id: tenant.workspaceId },
      data: { dataExportEnabled: false },
    });
    __setCookie('rb_session', tenant.sessionToken);

    const result = await exportAppointmentsAction(tenant.workspaceId, {
      dateFrom: '2020-01-01',
      dateTo: '2020-01-31',
      fields: ['customerName'],
      format: 'csv',
    });

    expect(result.success).toBe(false);
  });

  it('blocks editing booking-page branding once Booking pages is disabled for the organization', async () => {
    await prisma.workspace.update({
      where: { id: tenant.workspaceId },
      data: { bookingPagesEnabled: false },
    });
    __setCookie('rb_session', tenant.sessionToken);

    const result = await updateBookingPageBrandingAction(tenant.workspaceId, {});

    expect(result.success).toBe(false);
  });

  it('allows the same actions again once features are re-enabled', async () => {
    await prisma.workspace.update({
      where: { id: tenant.workspaceId },
      data: { workflowsEnabled: false },
    });
    __setCookie('rb_session', tenant.sessionToken);

    const blocked = await createWorkflowAction(tenant.workspaceId, {
      name: 'Reminder',
      trigger: 'BOOKING_CREATED',
      channel: 'EMAIL',
      recipient: 'CUSTOMER',
    });
    expect(blocked.success).toBe(false);

    await prisma.workspace.update({
      where: { id: tenant.workspaceId },
      data: { workflowsEnabled: true },
    });

    const allowed = await createWorkflowAction(tenant.workspaceId, {
      name: 'Reminder',
      trigger: 'BOOKING_CREATED',
      channel: 'EMAIL',
      recipient: 'CUSTOMER',
    });
    expect(allowed.success).toBe(true);
  });
});
