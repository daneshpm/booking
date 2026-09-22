import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { __setCookie, __resetRequestContext } from './stubs/next-headers';
import { resetDatabase, createTenant, type TestTenant } from './helpers';
import { __resetRateLimits } from '../../lib/rate-limit';

import {
  updateMemberRoleAction,
  sendInvitationAction,
  updateWorkspaceSettingsAction,
} from '../../app/(dashboard)/settings/actions';
import { updateStaffAction, deleteStaffAction } from '../../app/(dashboard)/staff/actions';

/**
 * Privilege escalation, driven through the real server actions.
 *
 * Tenant isolation asks whether alpha can reach beta's data. This asks the
 * other question: inside one workspace, can a lower-ranked member acquire a
 * higher rank, or do something only a higher rank may do?
 *
 * Ranks are numeric — OWNER 40 > ADMIN 30 > STAFF 20 > RECEPTIONIST 10 — and
 * the only thing between a STAFF session and workspace ownership is that each
 * privileged action remembers to demand the right minimum. The dashboard hides
 * the buttons, but a server action is a public endpoint and a hidden button is
 * not an authorisation control.
 */
describe('privilege escalation within a workspace', () => {
  let owner: TestTenant;

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
    owner = await createTenant('owner');
  });

  /**
   * Join a second user to the owner's workspace at the given rank.
   *
   * `createTenant` also gives them a workspace of their own, which is exactly
   * the realistic case: a person can be OWNER somewhere and STAFF here, and
   * the rank that must govern is the one for *this* workspace.
   */
  async function memberOf(
    workspaceId: string,
    role: 'ADMIN' | 'STAFF' | 'RECEPTIONIST',
    label: string
  ): Promise<{ userId: string; email: string; token: string }> {
    const other = await createTenant(label);
    await prisma.workspaceMember.create({ data: { workspaceId, userId: other.userId, role } });
    return { userId: other.userId, email: other.email, token: other.sessionToken };
  }

  async function roleOf(workspaceId: string, userId: string): Promise<string | undefined> {
    const row = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
    });
    return row?.role;
  }

  const SETTINGS = { name: 'Taken Over', timezone: 'Asia/Kolkata', currency: 'INR' };

  describe('STAFF acting above their rank', () => {
    it('cannot promote itself to OWNER', async () => {
      const staff = await memberOf(owner.workspaceId, 'STAFF', 'staff');
      __setCookie('rb_session', staff.token);

      const result = await updateMemberRoleAction(owner.workspaceId, staff.email, 'OWNER');

      expect(result.success).toBe(false);
      expect(await roleOf(owner.workspaceId, staff.userId)).toBe('STAFF');
    });

    it('cannot promote itself to ADMIN', async () => {
      const staff = await memberOf(owner.workspaceId, 'STAFF', 'staff');
      __setCookie('rb_session', staff.token);

      const result = await updateMemberRoleAction(owner.workspaceId, staff.email, 'ADMIN');

      expect(result.success).toBe(false);
      expect(await roleOf(owner.workspaceId, staff.userId)).toBe('STAFF');
    });

    it('cannot demote the owner', async () => {
      const staff = await memberOf(owner.workspaceId, 'STAFF', 'staff');
      __setCookie('rb_session', staff.token);

      const result = await updateMemberRoleAction(owner.workspaceId, owner.email, 'RECEPTIONIST');

      expect(result.success).toBe(false);
      expect(await roleOf(owner.workspaceId, owner.userId)).toBe('OWNER');
    });

    it('cannot send an invitation, which would let it choose a role', async () => {
      const staff = await memberOf(owner.workspaceId, 'STAFF', 'staff');
      __setCookie('rb_session', staff.token);

      const result = await sendInvitationAction(owner.workspaceId, {
        email: 'outsider@example.com',
        role: 'ADMIN',
      });

      expect(result.success).toBe(false);
      expect(await prisma.invitation.count()).toBe(0);
    });

    it('cannot change workspace settings, which require ADMIN', async () => {
      const staff = await memberOf(owner.workspaceId, 'STAFF', 'staff');
      __setCookie('rb_session', staff.token);

      const result = await updateWorkspaceSettingsAction(owner.workspaceId, SETTINGS);

      expect(result.success).toBe(false);
      const ws = await prisma.workspace.findUnique({ where: { id: owner.workspaceId } });
      expect(ws?.name).not.toBe(SETTINGS.name);
    });

    it('cannot delete a staff member, which requires ADMIN', async () => {
      const staff = await memberOf(owner.workspaceId, 'STAFF', 'staff');
      __setCookie('rb_session', staff.token);

      const result = await deleteStaffAction(owner.workspaceId, owner.staffId);

      expect(result.success).toBe(false);
      expect(await prisma.staff.count({ where: { id: owner.staffId } })).toBe(1);
    });
  });

  describe('RECEPTIONIST acting above their rank', () => {
    it('cannot edit a staff member, which requires ADMIN', async () => {
      const recep = await memberOf(owner.workspaceId, 'RECEPTIONIST', 'recep');
      __setCookie('rb_session', recep.token);

      const result = await updateStaffAction(owner.workspaceId, owner.staffId, {
        name: 'Renamed By Receptionist',
        email: 'renamed@example.com',
        timezone: 'Asia/Kolkata',
      } as Parameters<typeof updateStaffAction>[2]);

      expect(result.success).toBe(false);
      const staffRow = await prisma.staff.findUnique({ where: { id: owner.staffId } });
      expect(staffRow?.name).not.toBe('Renamed By Receptionist');
    });

    it('cannot promote itself', async () => {
      const recep = await memberOf(owner.workspaceId, 'RECEPTIONIST', 'recep');
      __setCookie('rb_session', recep.token);

      const result = await updateMemberRoleAction(owner.workspaceId, recep.email, 'OWNER');

      expect(result.success).toBe(false);
      expect(await roleOf(owner.workspaceId, recep.userId)).toBe('RECEPTIONIST');
    });
  });

  describe('ADMIN acting above their rank', () => {
    it('cannot promote itself to OWNER, because role changes are OWNER-only', async () => {
      const admin = await memberOf(owner.workspaceId, 'ADMIN', 'admin');
      __setCookie('rb_session', admin.token);

      const result = await updateMemberRoleAction(owner.workspaceId, admin.email, 'OWNER');

      expect(result.success).toBe(false);
      expect(await roleOf(owner.workspaceId, admin.userId)).toBe('ADMIN');
    });

    it('cannot invite anyone, even at a rank below its own', async () => {
      const admin = await memberOf(owner.workspaceId, 'ADMIN', 'admin');
      __setCookie('rb_session', admin.token);

      const result = await sendInvitationAction(owner.workspaceId, {
        email: 'new@example.com',
        role: 'STAFF',
      });

      expect(result.success).toBe(false);
      expect(await prisma.invitation.count()).toBe(0);
    });
  });

  describe('OWNER is never grantable by invitation', () => {
    it('refuses an OWNER invitation even when the owner sends it', async () => {
      __setCookie('rb_session', owner.sessionToken);

      const result = await sendInvitationAction(owner.workspaceId, {
        email: 'someone@example.com',
        role: 'OWNER' as unknown as 'ADMIN',
      });

      expect(result.success).toBe(false);
      expect(await prisma.invitation.count({ where: { role: 'OWNER' } })).toBe(0);
    });
  });

  describe('positive controls — the owner really can do these things', () => {
    // Without these, every refusal above could be passing for an unrelated
    // reason (a malformed argument, say) and the suite would still be green.
    it('lets the owner promote a staff member to ADMIN', async () => {
      const staff = await memberOf(owner.workspaceId, 'STAFF', 'staff');
      __setCookie('rb_session', owner.sessionToken);

      const result = await updateMemberRoleAction(owner.workspaceId, staff.email, 'ADMIN');

      expect(result.success).toBe(true);
      expect(await roleOf(owner.workspaceId, staff.userId)).toBe('ADMIN');
    });

    it('lets the owner change workspace settings', async () => {
      __setCookie('rb_session', owner.sessionToken);

      const result = await updateWorkspaceSettingsAction(owner.workspaceId, SETTINGS);

      expect(result.success).toBe(true);
    });

    it('lets the owner invite an ADMIN', async () => {
      __setCookie('rb_session', owner.sessionToken);

      const result = await sendInvitationAction(owner.workspaceId, {
        email: 'invitee@example.com',
        role: 'ADMIN',
      });

      expect(result.success).toBe(true);
      expect(await prisma.invitation.count({ where: { role: 'ADMIN' } })).toBe(1);
    });
  });
});
