'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@bookings/database';
import {
  hashPassword,
  verifyPassword,
  fakeVerifyPassword,
  validatePasswordPolicy,
} from '@bookings/auth';
import { startSession, endSession, getSession } from '@/lib/session';
import {
  checkRateLimit,
  LOGIN_LIMIT,
  LOGIN_PER_ACCOUNT_LIMIT,
  SIGNUP_LIMIT,
  PASSWORD_CHANGE_LIMIT,
} from '@/lib/rate-limit';
import { headers } from 'next/headers';

export interface SignupInput {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
}

export interface AuthResult {
  success: boolean;
  workspaceSlug?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Caller address, used to throttle authentication attempts.
 *
 * The forwarded header is client-supplied, so this is not proof of identity.
 * Login is additionally throttled per account below, which no header can
 * sidestep.
 */
async function callerAddress(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    'unknown'
  );
}

const THROTTLED = 'Too many attempts. Please wait a few minutes and try again.';

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Reserve a unique workspace slug.
 *
 * The loop is bounded and the database still holds a unique constraint on the
 * column, so a concurrent signup that wins the race fails on insert rather than
 * silently creating a duplicate.
 */
async function reserveSlug(base: string): Promise<string> {
  const root = slugify(base) || 'workspace';
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt}`;
    const taken = await prisma.workspace.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!taken) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

/**
 * Create an account, its workspace, and an owner membership, then sign the user in.
 *
 * The user, workspace, membership and booking page are written in one
 * transaction so a partial signup cannot leave an account with no workspace.
 */
export async function signupUserAction(data: SignupInput): Promise<AuthResult> {
  try {
    const name = data.name?.trim() ?? '';
    const email = data.email?.toLowerCase().trim() ?? '';
    const workspaceName = data.workspaceName?.trim() ?? '';
    const password = data.password ?? '';

    if (!(await checkRateLimit(`signup:${await callerAddress()}`, SIGNUP_LIMIT)).allowed) {
      return { success: false, error: THROTTLED };
    }

    const fieldErrors: Record<string, string[]> = {};

    if (!name) fieldErrors.name = ['Please enter your full name.'];
    if (!email) {
      fieldErrors.email = ['Please enter your email address.'];
    } else if (!EMAIL_PATTERN.test(email)) {
      fieldErrors.email = ['Please enter a valid email address.'];
    }
    if (!workspaceName) fieldErrors.workspaceName = ['Please enter a workspace name.'];

    const policy = validatePasswordPolicy(password);
    if (!policy.valid) fieldErrors.password = policy.errors;

    if (Object.keys(fieldErrors).length > 0) {
      return { success: false, error: 'Please correct the highlighted fields.', fieldErrors };
    }

    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      return {
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
        fieldErrors: { email: ['This email is already registered.'] },
      };
    }

    const passwordHash = await hashPassword(password);
    const slug = await reserveSlug(workspaceName);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email, name, passwordHash },
        select: { id: true },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug,
          timezone: 'Asia/Kolkata',
          currency: 'INR',
          members: { create: { userId: createdUser.id, role: 'OWNER' } },
        },
        select: { id: true },
      });

      // The owner is also a bookable staff member, so a brand new workspace can
      // take appointments without any further setup.
      await tx.staff.create({
        data: {
          workspaceId: workspace.id,
          userId: createdUser.id,
          name,
          email,
          timezone: 'Asia/Kolkata',
          isActive: true,
          workingHours: {
            create: [1, 2, 3, 4, 5].map((dayOfWeek) => ({
              dayOfWeek,
              startTime: '09:00',
              endTime: '18:00',
              breaks: { create: [{ startTime: '13:00', endTime: '14:00' }] },
            })),
          },
        },
      });

      await tx.bookingPage.create({
        data: {
          workspaceId: workspace.id,
          slug,
          title: `${workspaceName} Booking Portal`,
          description: `Schedule an appointment with ${workspaceName}.`,
          isPublished: true,
        },
      });

      return createdUser;
    });

    await startSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { success: true, workspaceSlug: slug };
  } catch (err) {
    console.error('Signup failed:', err);
    return { success: false, error: 'Could not create your account. Please try again.' };
  }
}

/**
 * Authenticate with email and password.
 *
 * Wrong password and unknown account return the same message and both spend
 * roughly the same time hashing, so the response cannot be used to enumerate
 * which email addresses are registered.
 */
export async function loginUserAction(email: string, password: string): Promise<AuthResult> {
  try {
    const cleanEmail = email?.toLowerCase().trim() ?? '';

    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter your email address and password.' };
    }

    // Verifying a password costs real CPU, and the unknown-account path below
    // deliberately spends the same to avoid revealing which addresses exist.
    // Without a cap that design becomes a denial-of-service lever, and an
    // unlimited guessing oracle.
    const address = await callerAddress();
    if (!(await checkRateLimit(`login:${address}`, LOGIN_LIMIT)).allowed) {
      return { success: false, error: THROTTLED };
    }
    // Also per account, so a distributed attempt cannot escape the cap by
    // rotating the forwarded address against one target.
    if (!(await checkRateLimit(`login-account:${cleanEmail}`, LOGIN_PER_ACCOUNT_LIMIT)).allowed) {
      return { success: false, error: THROTTLED };
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } } },
    });

    if (!user) {
      await fakeVerifyPassword();
      return { success: false, error: 'Invalid email or password.' };
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) {
      return { success: false, error: 'Invalid email or password.' };
    }

    if (!user.isActive) {
      return {
        success: false,
        error: 'This account has been deactivated. Contact your administrator.',
      };
    }

    if (user.memberships.length === 0) {
      return {
        success: false,
        error: 'Your account is not linked to a workspace. Contact your administrator.',
      };
    }

    await startSession(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    return { success: true, workspaceSlug: user.memberships[0].workspace.slug };
  } catch (err) {
    console.error('Login failed:', err);
    return { success: false, error: 'Could not sign you in. Please try again.' };
  }
}

/** Revoke the current session and return to the login page. */
export async function logoutAction(): Promise<never> {
  await endSession();
  redirect('/login');
}

/** Change the signed-in user's password and revoke every other session. */
export async function changePasswordAction(
  currentPassword: string,
  newPassword: string
): Promise<AuthResult> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'You must be signed in to change your password.' };
    }

    if (
      !(await checkRateLimit(`password-change:${session.user.id}`, PASSWORD_CHANGE_LIMIT)).allowed
    ) {
      return { success: false, error: THROTTLED };
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, passwordHash: true, isActive: true },
    });
    if (!user) {
      return { success: false, error: 'Account not found.' };
    }
    // An account deactivated during a live session must not be able to set a
    // new password and mint a fresh session.
    if (!user.isActive) {
      return { success: false, error: 'This account has been deactivated.' };
    }

    if (!(await verifyPassword(currentPassword, user.passwordHash))) {
      return {
        success: false,
        error: 'Your current password is incorrect.',
        fieldErrors: { currentPassword: ['Incorrect password.'] },
      };
    }

    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return {
        success: false,
        error: 'Please choose a stronger password.',
        fieldErrors: { newPassword: policy.errors },
      };
    }

    const passwordHash = await hashPassword(newPassword);

    // Revoke every session, then issue a fresh one for this browser, so a
    // stolen session elsewhere stops working the moment the password changes.
    await prisma.$transaction([
      prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      prisma.session.deleteMany({ where: { userId: user.id } }),
    ]);

    await startSession(user.id);
    return { success: true };
  } catch (err) {
    console.error('Password change failed:', err);
    return { success: false, error: 'Could not change your password. Please try again.' };
  }
}
