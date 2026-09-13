'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { z } from 'zod';
import { requireSession, requireWorkspace, toActionError, startSession } from '@/lib/session';
import { verifyPassword, hashPassword, validatePasswordPolicy } from '@bookings/auth';
import { checkRateLimit, PASSWORD_CHANGE_LIMIT } from '@/lib/rate-limit';

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
  phone: z.string().trim().optional(),
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
