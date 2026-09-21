'use server';

import { headers } from 'next/headers';
import { prisma } from '@bookings/database';
import {
  createPasswordResetToken,
  consumePasswordResetToken,
  resolvePasswordResetToken,
  hashPassword,
  validatePasswordPolicy,
  RESET_TTL_MINUTES,
} from '@bookings/auth';
import { sendMail, isMailConfigured } from '@bookings/notifications';
import {
  checkRateLimit,
  PASSWORD_RESET_LIMIT,
  PASSWORD_RESET_PER_ACCOUNT_LIMIT,
} from '@/lib/rate-limit';

export interface ResetResult {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Pause for roughly as long as the work this request deliberately skipped.
 *
 * Every branch of a password-reset request returns the same neutral reply,
 * which is worth nothing if the branches take visibly different amounts of
 * time. Not exported: a 'use server' module may only export async functions
 * that are safe to call from a browser, and this is neither.
 */
function neutralDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 120 + Math.random() * 80));
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Identical whether or not the address is registered.
 *
 * Telling the caller that no account exists turns this into a free membership
 * oracle, which is the usual way an attacker builds a target list.
 */
const NEUTRAL_REPLY =
  'If that email address has an account, a reset link is on its way. The link expires in an hour.';

async function callerAddress(): Promise<string> {
  const headerList = await headers();
  return (
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headerList.get('x-real-ip') ||
    'unknown'
  );
}

function resetUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return `${base}/reset-password/confirm?token=${encodeURIComponent(token)}`;
}

/** Send a reset link, if the address belongs to an active account. */
export async function requestPasswordResetAction(email: string): Promise<ResetResult> {
  try {
    const cleanEmail = email?.toLowerCase().trim() ?? '';

    if (!cleanEmail || !EMAIL_PATTERN.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    // Each request sends an email, so it is capped per caller and per address.
    const throttled =
      !(await checkRateLimit(`reset:${await callerAddress()}`, PASSWORD_RESET_LIMIT)).allowed ||
      !(await checkRateLimit(`reset-account:${cleanEmail}`, PASSWORD_RESET_PER_ACCOUNT_LIMIT))
        .allowed;

    if (throttled) {
      // Still the neutral reply: a distinct "too many requests" here would
      // confirm the address is worth retrying.
      return { success: true };
    }

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (!user || !user.isActive) {
      await neutralDelay();
      return { success: true };
    }

    const { token } = await createPasswordResetToken(user.id);
    const link = resetUrl(token);

    // A distinct reply here would only ever be reached for a registered
    // address, turning any mail outage into a membership oracle. The operator
    // is told through the logs instead.
    if (!isMailConfigured()) {
      console.error('Password reset requested but SMTP is not configured; no link was sent.');
      // Delayed like every other branch. Returning straight away here would
      // make a registered address the *fastest* reply rather than the
      // slowest, which is the same oracle wearing a different hat.
      await neutralDelay();
      return { success: true };
    }

    // Dispatched without awaiting. The SMTP round trip is the one part of
    // this path whose duration depends on the address being registered, and
    // it is measured in seconds against the unregistered path's ~150 ms — so
    // awaiting it here is precisely what turned the carefully neutral reply
    // into a timing oracle for "is this address a customer of ours".
    //
    // The floating promise is safe because this runs in a long-lived Node
    // server rather than a per-request lambda, and its outcome is only ever
    // logged: the caller gets the same neutral reply whether delivery
    // succeeds or fails, so there is nothing to wait for.
    void sendMail({
      to: user.email,
      subject: 'Reset your Rooman Bookings password',
      text:
        `Hello ${user.name},\n\n` +
        `Someone asked to reset the password for this account. Open the link below to choose a new one.\n\n` +
        `${link}\n\n` +
        `The link expires in ${RESET_TTL_MINUTES} minutes and can be used once.\n\n` +
        `If this was not you, no action is needed: your password has not changed.\n`,
    })
      .then((result) => {
        if (!result.delivered) console.error('Password reset email failed:', result.error);
      })
      .catch((err) => console.error('Password reset email threw:', err));

    await neutralDelay();

    return { success: true };
  } catch (err) {
    console.error('Password reset request failed:', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}

/** Whether a reset link is still usable, for rendering the confirm page. */
export async function checkResetTokenAction(token: string): Promise<{ valid: boolean }> {
  const resolved = await resolvePasswordResetToken(token);
  return { valid: Boolean(resolved) };
}

/** Set a new password using a reset link. */
export async function confirmPasswordResetAction(
  token: string,
  newPassword: string
): Promise<ResetResult> {
  try {
    const policy = validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return {
        success: false,
        error: 'Please choose a stronger password.',
        fieldErrors: { password: policy.errors },
      };
    }

    const resolved = await resolvePasswordResetToken(token);
    if (!resolved) {
      return {
        success: false,
        error: 'This reset link is invalid or has expired. Please request a new one.',
      };
    }

    const passwordHash = await hashPassword(newPassword);
    const applied = await consumePasswordResetToken(resolved.id, resolved.userId, passwordHash);

    if (!applied) {
      return {
        success: false,
        error: 'This reset link has already been used. Please request a new one.',
      };
    }

    return { success: true };
  } catch (err) {
    console.error('Password reset confirmation failed:', err);
    return { success: false, error: 'Something went wrong. Please try again.' };
  }
}
