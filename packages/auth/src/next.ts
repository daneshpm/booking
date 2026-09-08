import 'server-only';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, createSession, destroySession, resolveSession } from './session';
import type { AuthSession, SessionWorkspace } from './session';
import {
  resolveWorkspaceAccess,
  resolveWorkspaceAccessBySlug,
  AuthorizationError,
} from './authorization';
import type { Role } from '@bookings/database';

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Cookie attributes for the session token.
 *
 * httpOnly keeps the token out of reach of any script on the page, so an XSS
 * bug cannot exfiltrate a live session. sameSite=lax blocks the cookie from
 * riding along on cross-site form posts.
 */
function cookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}

/** Read the current session, or null when there is no valid one. */
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  return resolveSession(token);
}

/**
 * Read the current session or send the visitor to the login page.
 * Use in server components that must not render for anonymous visitors.
 */
export async function requireSession(returnTo?: string): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    const target = returnTo ? `/login?next=${encodeURIComponent(returnTo)}` : '/login';
    redirect(target);
  }
  return session;
}

/**
 * The tenant-isolation guard for server actions and pages.
 *
 * Resolves the workspace a request targets and confirms the caller holds a
 * membership on it with at least `requiredRole`. A workspace id that arrives
 * from the client is only honoured after that check, so it cannot be swapped
 * for another tenant's id.
 */
export async function requireWorkspace(
  requestedWorkspaceId?: string | null,
  requiredRole: Role = 'RECEPTIONIST'
): Promise<{ session: AuthSession; workspace: SessionWorkspace }> {
  const session = await getSession();
  const workspace = resolveWorkspaceAccess(session, requestedWorkspaceId, requiredRole);
  return { session: session!, workspace };
}

/** Same guard for routes that address a workspace by slug. */
export async function requireWorkspaceBySlug(
  slug: string,
  requiredRole: Role = 'RECEPTIONIST'
): Promise<{ session: AuthSession; workspace: SessionWorkspace }> {
  const session = await getSession();
  const workspace = resolveWorkspaceAccessBySlug(session, slug, requiredRole);
  return { session: session!, workspace };
}

/** Issue a session for a user and attach the cookie to the response. */
export async function startSession(userId: string): Promise<void> {
  const headerList = await headers();
  const { token, expiresAt } = await createSession({
    userId,
    userAgent: headerList.get('user-agent'),
    ipAddress:
      headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? headerList.get('x-real-ip'),
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

/** Revoke the current session and clear the cookie. */
export async function endSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  await destroySession(token);
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Convert an authorization failure into a result object for server actions,
 * which return errors to the client rather than throwing.
 */
export function toActionError(err: unknown): { success: false; error: string } {
  if (err instanceof AuthorizationError) {
    return { success: false, error: err.message };
  }
  // Never surface a raw internal error message to the browser.
  console.error('Unhandled server action error:', err);
  return { success: false, error: 'Something went wrong. Please try again.' };
}

export { AuthorizationError };
export type { AuthSession, SessionWorkspace };
