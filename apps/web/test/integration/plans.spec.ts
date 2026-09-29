import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { createSession } from '@bookings/auth';
import { hashPassword } from '@bookings/core';
import { __setCookie, __resetRequestContext } from './stubs/next-headers';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

import {
  getPlansAction,
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  type PlanInput,
} from '../../app/super-admin/actions';

/**
 * Pricing plans shown on the public landing page. Purely marketing content —
 * see the Plan model's comment for why it has no link to any real
 * organization's billing — but still platform-admin-only to write, the same
 * as every other super-admin action.
 */
describe('pricing plans (super admin)', () => {
  let tenant: TestTenant;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    await prisma.plan.deleteMany();
    await __resetRateLimits();
    __resetRequestContext();
    tenant = await createTenant('plans');
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

  const validInput: PlanInput = {
    name: 'Pro',
    price: '999.00',
    currency: 'INR',
    billingPeriod: 'MONTHLY',
    features: ['Unlimited bookings', 'Priority support'],
    displayOrder: 0,
    isPublished: true,
  };

  it('refuses an ordinary workspace owner for every plan action', async () => {
    __setCookie('rb_session', tenant.sessionToken);

    expect((await getPlansAction()).success).toBe(false);
    expect((await createPlanAction(validInput)).success).toBe(false);
    expect(await prisma.plan.count()).toBe(0);
  });

  it('lets a platform admin create, list, update, and delete a plan', async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);

    const created = await createPlanAction(validInput);
    expect(created.success).toBe(true);
    if (!created.success) return;

    const listed = await getPlansAction();
    expect(listed.success).toBe(true);
    if (!listed.success) return;
    expect(listed.plans).toHaveLength(1);
    expect(listed.plans[0].name).toBe('Pro');
    expect(listed.plans[0].features).toEqual(['Unlimited bookings', 'Priority support']);

    const updated = await updatePlanAction(created.planId, { ...validInput, name: 'Pro (renamed)' });
    expect(updated.success).toBe(true);
    const afterUpdate = await prisma.plan.findUniqueOrThrow({ where: { id: created.planId } });
    expect(afterUpdate.name).toBe('Pro (renamed)');

    const deleted = await deletePlanAction(created.planId);
    expect(deleted.success).toBe(true);
    expect(await prisma.plan.count()).toBe(0);
  });

  it('rejects a plan with an invalid price rather than storing garbage', async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);

    const result = await createPlanAction({ ...validInput, price: 'not-a-number' });

    expect(result.success).toBe(false);
    expect(await prisma.plan.count()).toBe(0);
  });
});
