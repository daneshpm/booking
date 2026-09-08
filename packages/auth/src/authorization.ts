import type { Role } from '@bookings/database';
import type { AuthSession, SessionWorkspace } from './session';

/**
 * Role hierarchy. A role satisfies a requirement when its rank is at least the
 * required rank, so OWNER passes anywhere ADMIN is required.
 */
const ROLE_RANK: Record<Role, number> = {
  OWNER: 40,
  ADMIN: 30,
  STAFF: 20,
  RECEPTIONIST: 10,
};

export class AuthorizationError extends Error {
  readonly code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NO_WORKSPACE';

  constructor(code: 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NO_WORKSPACE', message: string) {
    super(message);
    this.name = 'AuthorizationError';
    this.code = code;
  }
}

export function roleSatisfies(actual: Role, required: Role): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

/**
 * Resolve which workspace a request targets and confirm the session owns it.
 *
 * This is the single tenant-isolation checkpoint. A workspace id supplied by the
 * client is only ever accepted after confirming the session holds a membership
 * for it; otherwise any signed-in user could address another tenant's rows by
 * editing a form field.
 *
 * With no requested id, the session's first workspace is used.
 */
export function resolveWorkspaceAccess(
  session: AuthSession | null,
  requestedWorkspaceId?: string | null,
  requiredRole: Role = 'RECEPTIONIST'
): SessionWorkspace {
  if (!session) {
    throw new AuthorizationError('UNAUTHENTICATED', 'You must be signed in to perform this action.');
  }

  if (session.workspaces.length === 0) {
    throw new AuthorizationError('NO_WORKSPACE', 'Your account does not belong to any workspace.');
  }

  const workspace = requestedWorkspaceId
    ? session.workspaces.find((w) => w.id === requestedWorkspaceId)
    : session.workspaces[0];

  if (!workspace) {
    // Deliberately identical to the permission error: telling the caller that a
    // workspace exists but is not theirs would confirm the id is real.
    throw new AuthorizationError('FORBIDDEN', 'You do not have access to this workspace.');
  }

  if (!roleSatisfies(workspace.role, requiredRole)) {
    throw new AuthorizationError(
      'FORBIDDEN',
      `This action requires the ${requiredRole} role or higher.`
    );
  }

  return workspace;
}

/** Same check keyed by slug, for routes that address a workspace by slug. */
export function resolveWorkspaceAccessBySlug(
  session: AuthSession | null,
  slug: string,
  requiredRole: Role = 'RECEPTIONIST'
): SessionWorkspace {
  if (!session) {
    throw new AuthorizationError('UNAUTHENTICATED', 'You must be signed in to perform this action.');
  }
  const workspace = session.workspaces.find((w) => w.slug === slug);
  if (!workspace) {
    throw new AuthorizationError('FORBIDDEN', 'You do not have access to this workspace.');
  }
  if (!roleSatisfies(workspace.role, requiredRole)) {
    throw new AuthorizationError(
      'FORBIDDEN',
      `This action requires the ${requiredRole} role or higher.`
    );
  }
  return workspace;
}
