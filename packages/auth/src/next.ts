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
import { logger } from '@bookings/core';

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
  if (!session) {
    const headerList = await headers();
    const isServerAction = headerList.has('next-action');
    if (!isServerAction) {
      redirect('/login');
    }
    throw new AuthorizationError(
      'UNAUTHENTICATED',
      'You must be signed in to perform this action.'
    );
  }

  let workspace: SessionWorkspace;
  try {
    workspace = resolveWorkspaceAccess(session, requestedWorkspaceId, requiredRole);
  } catch (err) {
    const headerList = await headers();
    const isServerAction = headerList.has('next-action');
    if (!isServerAction && err instanceof AuthorizationError) {
      if (err.code === 'FORBIDDEN') {
        redirect('/appointments');
      }
      if (err.code === 'NO_WORKSPACE') {
        // A platform admin deliberately holds no workspace membership (see
        // User.isPlatformAdmin), so this is not the dead end it is for
        // anyone else — send them to the one place their account works,
        // rather than bouncing them to a login page they are already past.
        redirect(session.user.isPlatformAdmin ? '/super-admin' : '/login');
      }
    }
    throw err;
  }

  return { session, workspace };
}

/** Same guard for routes that address a workspace by slug. */
export async function requireWorkspaceBySlug(
  slug: string,
  requiredRole: Role = 'RECEPTIONIST'
): Promise<{ session: AuthSession; workspace: SessionWorkspace }> {
  const session = await getSession();
  if (!session) {
    const headerList = await headers();
    const isServerAction = headerList.has('next-action');
    if (!isServerAction) {
      redirect('/login');
    }
    throw new AuthorizationError(
      'UNAUTHENTICATED',
      'You must be signed in to perform this action.'
    );
  }

  let workspace: SessionWorkspace;
  try {
    workspace = resolveWorkspaceAccessBySlug(session, slug, requiredRole);
  } catch (err) {
    const headerList = await headers();
    const isServerAction = headerList.has('next-action');
    if (!isServerAction && err instanceof AuthorizationError) {
      if (err.code === 'FORBIDDEN') {
        redirect('/appointments');
      }
      if (err.code === 'NO_WORKSPACE') {
        redirect(session.user.isPlatformAdmin ? '/super-admin' : '/login');
      }
    }
    throw err;
  }

  return { session, workspace };
}

/**
 * The platform-admin guard.
 *
 * Deliberately not a variant of requireWorkspace: that function's whole job is
 * resolving *a* workspace, and this one exists specifically for the one page
 * that must never resolve to a single workspace at all. Keeping them as two
 * separate functions means a bug in one cannot silently widen the other.
 *
 * A non-admin who is signed in is sent to their own dashboard, not told this
 * page exists and refused — the same "don't confirm what you can't see"
 * posture requireWorkspace already uses for a foreign workspace id.
 *
 * Same server-action distinction requireWorkspace makes, for the same
 * reason: redirect() throws a Next-internal signal that Next's own machinery
 * must be the one to catch. A server action's own try/catch would otherwise
 * swallow it and turn a redirect into a generic error message instead — this
 * is why it throws AuthorizationError there rather than redirecting.
 */
export async function requirePlatformAdmin(): Promise<AuthSession> {
  const session = await getSession();

  // Checked lazily, only on a failure path, matching requireWorkspace above:
  // a successful call never needs to know whether it arrived as a server
  // action, so it never asks.
  if (!session) {
    const headerList = await headers();
    if (!headerList.has('next-action')) redirect('/login');
    throw new AuthorizationError(
      'UNAUTHENTICATED',
      'You must be signed in to perform this action.'
    );
  }
  if (!session.user.isPlatformAdmin) {
    const headerList = await headers();
    if (!headerList.has('next-action')) redirect('/appointments');
    throw new AuthorizationError('FORBIDDEN', 'You do not have access to this page.');
  }
  return session;
}

/** A per-organization module a platform admin can turn off (see Workspace.*Enabled). */
export type WorkspaceFeature = 'workflows' | 'analytics' | 'dataExport' | 'bookingPages';

const FEATURE_FLAG_KEYS: Record<WorkspaceFeature, keyof SessionWorkspace> = {
  workflows: 'workflowsEnabled',
  analytics: 'analyticsEnabled',
  dataExport: 'dataExportEnabled',
  bookingPages: 'bookingPagesEnabled',
};

/**
 * The per-organization feature gate, layered on top of requireWorkspace rather
 * than folded into it: requireWorkspace's job is tenant isolation and role
 * rank, and mixing a third, unrelated concern into it is how a bug in one
 * check quietly widens the other. Call this after requireWorkspace has
 * already resolved the workspace.
 *
 * Same "hide is not enforcement" posture as everywhere else here: the nav
 * link disappearing is a courtesy, this is what actually blocks a direct
 * call.
 */
export async function requireWorkspaceFeature(
  workspace: SessionWorkspace,
  feature: WorkspaceFeature
): Promise<void> {
  if (workspace[FEATURE_FLAG_KEYS[feature]]) return;

  const headerList = await headers();
  if (!headerList.has('next-action')) redirect('/appointments');
  throw new AuthorizationError('FORBIDDEN', 'This feature is not enabled for your organization.');
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
  logger.error('Unhandled server action error', { err });
  return { success: false, error: 'Something went wrong. Please try again.' };
}

export { AuthorizationError };
export type { AuthSession, SessionWorkspace };
