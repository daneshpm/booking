'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { z } from 'zod';
import { requireSession, requireWorkspace, toActionError, startSession } from '@/lib/session';
import {
  verifyPassword,
  hashPassword,
  validatePasswordPolicy,
  generateSessionToken,
  hashSessionToken,
} from '@bookings/auth';
import { sendMail, isMailConfigured } from '@bookings/notifications';
import { checkRateLimit, PASSWORD_CHANGE_LIMIT, INVITE_LIMIT } from '@/lib/rate-limit';

/**
 * Reject a timezone the scheduling engine cannot resolve.
 */
function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Organization name must be at least 2 characters'),
  logoUrl: z.string().optional().nullable(),
  timezone: z
    .string()
    .trim()
    .min(1, 'Timezone is required')
    .refine(isValidTimezone, 'Please choose a valid IANA timezone, for example Asia/Kolkata.'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency must be a three-letter ISO code, for example INR.'),
});

export async function updateWorkspaceSettingsAction(
  workspaceId: string,
  data: { name: string; timezone: string; currency: string; logoUrl?: string | null }
) {
  try {
    // Only an administrator can change workspace-wide settings.
    await requireWorkspace(workspaceId, 'ADMIN');

    const validated = settingsSchema.parse(data);

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: validated.name,
        logoUrl: validated.logoUrl !== undefined ? validated.logoUrl || null : undefined,
        timezone: validated.timezone,
        currency: validated.currency,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/services');
    revalidatePath('/staff');
    revalidatePath('/availability');
    revalidatePath('/book');

    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    return toActionError(err);
  }
}

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required'),
  displayName: z.string().trim().optional(),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || /^\+?[0-9]{10,15}$/.test(val.replace(/\s+/g, '')),
      'Phone number must contain only numeric digits (10 to 15 digits).'
    ),
  gender: z.string().trim().optional(),
  country: z.string().trim().optional(),
  state: z.string().trim().optional(),
  language: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  bio: z.string().trim().max(300, 'Bio must be under 300 characters').optional(),
  headline: z.string().trim().max(100, 'Headline must be under 100 characters').optional(),
  instagram: z.string().trim().optional(),
  linkedin: z.string().trim().optional(),
  twitter: z.string().trim().optional(),
  website: z.string().trim().optional(),
  avatarUrl: z.string().trim().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export async function updateUserProfileAction(input: ProfileInput) {
  try {
    const session = await requireSession();
    const validated = profileSchema.parse(input);

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: validated.name,
        displayName: validated.displayName || validated.name,
        phone: validated.phone || null,
        gender: validated.gender || "I'd prefer not to say",
        country: validated.country || 'India',
        state: validated.state || 'Karnataka',
        language: validated.language || 'English',
        timezone: validated.timezone || 'Asia/Kolkata',
        bio: validated.bio || null,
        headline: validated.headline || null,
        instagram: validated.instagram ? validated.instagram.replace(/^@/, '') : null,
        linkedin: validated.linkedin || null,
        twitter: validated.twitter ? validated.twitter.replace(/^@/, '') : null,
        website: validated.website || null,
        avatarUrl: validated.avatarUrl || null,
      },
    });

    // Sync to staff profile in any active workspaces for this user.
    // Matching on email alone would also rewrite a different tenant's staff
    // row that happens to use the same address, so the email fallback is
    // limited to rows that are not yet linked to any user account.
    await prisma.staff.updateMany({
      where: {
        OR: [{ userId: session.user.id }, { email: session.user.email, userId: null }],
      },
      data: {
        name: validated.name,
        phone: validated.phone || null,
        timezone: validated.timezone || 'Asia/Kolkata',
        avatarUrl: validated.avatarUrl || null,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/staff');
    revalidatePath('/users');
    revalidatePath('/profile');

    return { success: true, user: updatedUser };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    return toActionError(err);
  }
}

export async function changeUserPasswordAction(formData: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) {
  try {
    const session = await requireSession();

    if (
      !(await checkRateLimit(`password-change:${session.user.id}`, PASSWORD_CHANGE_LIMIT)).allowed
    ) {
      return {
        success: false,
        error: 'Too many attempts. Please wait a few minutes and try again.',
      };
    }

    if (formData.newPassword !== formData.confirmPassword) {
      return { success: false, error: 'New password and confirmation do not match.' };
    }

    const policy = validatePasswordPolicy(formData.newPassword);
    if (!policy.valid) {
      return { success: false, error: policy.errors[0] || 'Password does not meet requirements.' };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user) {
      return { success: false, error: 'User account not found.' };
    }

    const isValidCurrent = await verifyPassword(formData.currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      return { success: false, error: 'Current password is incorrect.' };
    }

    const newHash = await hashPassword(formData.newPassword);

    // Revoke every session, then issue a fresh one for this browser, so a
    // stolen session elsewhere stops working the moment the password changes.
    await prisma.$transaction([
      prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: newHash } }),
      prisma.session.deleteMany({ where: { userId: session.user.id } }),
    ]);

    await startSession(session.user.id);

    return { success: true, message: 'Password changed successfully.' };
  } catch (err) {
    return toActionError(err);
  }
}

export async function revokeSessionAction(
  sessionId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await requireSession();

    // Ensure user only revokes their own sessions
    await prisma.session.deleteMany({
      where: {
        id: sessionId,
        userId: session.user.id,
      },
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (err) {
    const res = toActionError(err);
    return { success: false, error: res.error || 'Failed to revoke session' };
  }
}

export async function updateMemberRoleAction(
  workspaceId: string,
  userEmailOrId: string,
  newRole: 'OWNER' | 'ADMIN' | 'STAFF' | 'RECEPTIONIST'
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireWorkspace(workspaceId, 'OWNER');

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ id: userEmailOrId }, { email: userEmailOrId }],
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User account not found. The member must register an account first.',
      };
    }

    // A role can only be changed for someone already on the team. Creating a
    // new membership here would add any existing user account this workspace
    // ever learns the id or email of, with no invitation and no consent from
    // them at all, bypassing the invite-accept flow entirely.
    const targetMember = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
    });
    if (!targetMember) {
      return {
        success: false,
        error:
          'This person is not a member of this workspace yet. Send them an invitation instead.',
      };
    }

    if (newRole !== 'OWNER' && targetMember.role === 'OWNER') {
      const ownerCount = await prisma.workspaceMember.count({
        where: { workspaceId, role: 'OWNER' },
      });
      if (ownerCount <= 1) {
        return { success: false, error: 'Cannot demote the only workspace owner.' };
      }
    }

    await prisma.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: user.id } },
      data: { role: newRole },
    });

    revalidatePath('/settings');
    revalidatePath('/users');
    return { success: true };
  } catch (err) {
    const res = toActionError(err);
    return { success: false, error: res.error || 'Failed to update member role' };
  }
}

// ----------------------------------------------------
// TEAMMATE INVITATIONS
// ----------------------------------------------------

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INVITABLE_ROLES = ['ADMIN', 'STAFF', 'RECEPTIONIST'] as const;
const INVITE_TTL_HOURS = 72;

export interface InvitationActionResult {
  success: boolean;
  error?: string;
}

function inviteAcceptUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/accept-invite?token=${encodeURIComponent(token)}`;
}

/**
 * Invite someone to join this workspace by email.
 *
 * Requires OWNER, same as updateMemberRoleAction: granting a role is granting
 * access to real customer and business data, so it stays a decision only the
 * owner makes rather than something any admin can hand out.
 */
export async function sendInvitationAction(
  workspaceId: string,
  input: { email: string; role: (typeof INVITABLE_ROLES)[number] }
): Promise<InvitationActionResult> {
  try {
    const { session, workspace } = await requireWorkspace(workspaceId, 'OWNER');
    const email = input.email?.toLowerCase().trim() ?? '';

    if (!email || !EMAIL_PATTERN.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!INVITABLE_ROLES.includes(input.role)) {
      return { success: false, error: 'Choose a valid role for this invitation.' };
    }

    if (!(await checkRateLimit(`invite:${session.user.id}`, INVITE_LIMIT)).allowed) {
      return { success: false, error: 'Too many invitations sent. Please wait and try again.' };
    }

    const existingUser = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existingUser) {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId, userId: existingUser.id } },
      });
      if (existingMember) {
        return { success: false, error: 'This person is already a member of this workspace.' };
      }
    }

    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    // Upserted rather than deleted-then-created: the (workspaceId, email) pair
    // is unique for the row's whole lifetime, including after acceptance, so a
    // second invite to someone who was invited, accepted, and later removed
    // would otherwise collide with their original (accepted) row and fail.
    await prisma.invitation.upsert({
      where: { workspaceId_email: { workspaceId, email } },
      update: {
        role: input.role,
        tokenHash: hashSessionToken(token),
        invitedById: session.user.id,
        expiresAt,
        acceptedAt: null,
      },
      create: {
        workspaceId,
        email,
        role: input.role,
        tokenHash: hashSessionToken(token),
        invitedById: session.user.id,
        expiresAt,
      },
    });

    const link = inviteAcceptUrl(token);
    if (isMailConfigured()) {
      const result = await sendMail({
        to: email,
        subject: `You've been invited to join ${workspace.name} on Rooman Bookings`,
        text:
          `Hello,\n\n` +
          `${session.user.name} has invited you to join ${workspace.name} as a${input.role === 'ADMIN' ? 'n' : ''} ${input.role.toLowerCase()}.\n\n` +
          `Open the link below to accept:\n\n${link}\n\n` +
          `This invitation expires in ${INVITE_TTL_HOURS / 24} days.\n`,
      });
      if (!result.delivered) {
        console.error('Invitation email failed:', result.error);
      }
    } else {
      console.error('Invitation created but SMTP is not configured; no email was sent.', link);
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

/** Cancel a pending invitation before it is accepted. */
export async function revokeInvitationAction(
  workspaceId: string,
  invitationId: string
): Promise<InvitationActionResult> {
  try {
    await requireWorkspace(workspaceId, 'OWNER');

    await prisma.invitation.deleteMany({
      where: { id: invitationId, workspaceId, acceptedAt: null },
    });

    revalidatePath('/settings');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}
