'use server';

import { prisma } from '@bookings/database';
import { hashSessionToken, hashPassword, validatePasswordPolicy } from '@bookings/auth';
import { getSession, startSession } from '@/lib/session';

export interface InvitationPreview {
  valid: boolean;
  email?: string;
  workspaceName?: string;
  workspaceSlug?: string;
  role?: string;
  /** Whether this email already has a login: determines which form the page shows. */
  accountExists?: boolean;
}

async function resolveInvitation(token: string) {
  if (!token) return null;

  const invitation = await prisma.invitation.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: { workspace: { select: { name: true, slug: true } } },
  });

  if (!invitation) return null;
  if (invitation.acceptedAt) return null;
  if (invitation.expiresAt.getTime() <= Date.now()) return null;

  return invitation;
}

/** Whether an invite link is still usable, and which form the page should show. */
export async function checkInvitationAction(token: string): Promise<InvitationPreview> {
  const invitation = await resolveInvitation(token);
  if (!invitation) return { valid: false };

  const existingUser = await prisma.user.findUnique({
    where: { email: invitation.email },
    select: { id: true },
  });

  return {
    valid: true,
    email: invitation.email,
    workspaceName: invitation.workspace.name,
    workspaceSlug: invitation.workspace.slug,
    role: invitation.role,
    accountExists: Boolean(existingUser),
  };
}

export interface AcceptInvitationResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/** Accept an invitation by creating a brand new account (the invitee has no User row yet). */
export async function acceptInvitationAsNewUserAction(
  token: string,
  input: { name: string; password: string }
): Promise<AcceptInvitationResult> {
  try {
    const invitation = await resolveInvitation(token);
    if (!invitation) {
      return {
        success: false,
        error: 'This invitation is invalid or has expired. Ask for a new one.',
      };
    }

    const name = input.name?.trim() ?? '';
    if (!name) {
      return {
        success: false,
        error: 'Please enter your name.',
        fieldErrors: { name: ['Required.'] },
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true },
    });
    if (existingUser) {
      return {
        success: false,
        error: 'An account already exists for this email. Please log in instead.',
      };
    }

    const policy = validatePasswordPolicy(input.password);
    if (!policy.valid) {
      return {
        success: false,
        error: 'Please choose a stronger password.',
        fieldErrors: { password: policy.errors },
      };
    }

    const passwordHash = await hashPassword(input.password);

    const userId = await prisma.$transaction(async (tx) => {
      // Conditional on acceptedAt still null: two requests racing on the same
      // link end with exactly one account created, not two.
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new Error('ALREADY_ACCEPTED');
      }

      const user = await tx.user.create({
        data: { email: invitation.email, name, passwordHash },
        select: { id: true },
      });

      await tx.workspaceMember.create({
        data: { workspaceId: invitation.workspaceId, userId: user.id, role: invitation.role },
      });

      return user.id;
    });

    await startSession(userId);
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });

    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_ACCEPTED') {
      return { success: false, error: 'This invitation has already been accepted.' };
    }
    console.error('Accepting invitation failed:', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

/**
 * Accept an invitation for an email that already has an account.
 *
 * Requires the caller to already be signed in as that exact email: this is
 * what stops one account from claiming an invitation addressed to another.
 */
export async function acceptInvitationForExistingUserAction(
  token: string
): Promise<AcceptInvitationResult> {
  try {
    const invitation = await resolveInvitation(token);
    if (!invitation) {
      return {
        success: false,
        error: 'This invitation is invalid or has expired. Ask for a new one.',
      };
    }

    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Please log in with this email address first.' };
    }
    if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      return {
        success: false,
        error: `Please log in as ${invitation.email} to accept this invitation.`,
      };
    }

    const alreadyMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: invitation.workspaceId, userId: session.user.id },
      },
    });
    if (alreadyMember) {
      await prisma.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      return { success: true };
    }

    await prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, acceptedAt: null },
        data: { acceptedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw new Error('ALREADY_ACCEPTED');
      }
      await tx.workspaceMember.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: session.user.id,
          role: invitation.role,
        },
      });
    });

    return { success: true };
  } catch (err) {
    if (err instanceof Error && err.message === 'ALREADY_ACCEPTED') {
      return { success: false, error: 'This invitation has already been accepted.' };
    }
    console.error('Accepting invitation failed:', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
