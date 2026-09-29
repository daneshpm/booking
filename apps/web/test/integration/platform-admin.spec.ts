import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { createSession } from '@bookings/auth';
import { hashPassword } from '@bookings/core';
import { __setCookie, __resetRequestContext } from './stubs/next-headers';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

import { getOrganizationsAction } from '../../app/super-admin/actions';

/**
 * The one deliberate cross-tenant read in the codebase.
 *
 * Every other server action scopes its query to a workspace resolved by
 * requireWorkspace(). getOrganizationsAction() reads across all of them, on
 * purpose, for the platform-admin dashboard — which is exactly why this file
 * exists: a mistake here does not leak one tenant into another, it leaks
 * everyone into everyone, silently, the first time an ordinary account tries.
 */
describe('platform-admin organizations list', () => {
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
    await __resetRateLimits();
    __resetRequestContext();
    alpha = await createTenant('alpha');
    beta = await createTenant('beta');
  });

  /** A user with isPlatformAdmin set and no workspace membership at all. */
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

  it('refuses an anonymous caller', async () => {
    // No __setCookie call: __resetRequestContext() in beforeEach already
    // leaves no session cookie present, which is the actual anonymous case —
    // clearer than setting one to an empty string to the same effect.

    const result = await getOrganizationsAction();

    expect(result.success).toBe(false);
  });

  it('refuses an ordinary workspace owner — being OWNER of your own tenant is not platform access', async () => {
    __setCookie('rb_session', alpha.sessionToken);

    const result = await getOrganizationsAction();

    expect(result.success).toBe(false);
  });

  it('refuses an ordinary workspace owner even when several tenants exist to see', async () => {
    // Same check as above, but makes explicit what is actually at stake: with
    // alpha and beta both seeded, a bug here would not just misbehave, it
    // would show alpha the beta's whole organisation.
    __setCookie('rb_session', beta.sessionToken);

    const result = await getOrganizationsAction();

    expect(result.success).toBe(false);
  });

  it('lets a genuine platform admin see every organization', async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);

    const result = await getOrganizationsAction();

    expect(result.success).toBe(true);
    if (!result.success) return;
    const slugs = result.organizations.map((o) => o.slug);
    expect(slugs).toContain(alpha.workspaceSlug);
    expect(slugs).toContain(beta.workspaceSlug);
  });

  it("reports each organization's real owner and counts, not a placeholder", async () => {
    const token = await platformAdminSession();
    __setCookie('rb_session', token);

    const result = await getOrganizationsAction();

    expect(result.success).toBe(true);
    if (!result.success) return;
    const alphaRow = result.organizations.find((o) => o.slug === alpha.workspaceSlug);
    expect(alphaRow).toBeDefined();
    expect(alphaRow?.ownerEmail).toBe(alpha.email);
    // createTenant seeds exactly one staff member and one owner membership.
    expect(alphaRow?.memberCount).toBe(1);
    expect(alphaRow?.staffCount).toBe(1);
  });
});
