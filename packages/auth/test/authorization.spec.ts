import { describe, it, expect } from 'vitest';
import {
  resolveWorkspaceAccess,
  resolveWorkspaceAccessBySlug,
  roleSatisfies,
  AuthorizationError,
} from '../src/authorization';
import type { AuthSession } from '../src/session';

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    sessionId: 'sess-1',
    user: { id: 'user-1', email: 'a@example.com', name: 'A', avatarUrl: null },
    expiresAt: new Date(Date.now() + 60_000),
    workspaces: [
      {
        id: 'ws-owned',
        name: 'Alpha',
        slug: 'alpha',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        role: 'OWNER',
      },
    ],
    ...overrides,
  };
}

describe('role hierarchy', () => {
  it('lets a higher role satisfy a lower requirement', () => {
    expect(roleSatisfies('OWNER', 'ADMIN')).toBe(true);
    expect(roleSatisfies('ADMIN', 'STAFF')).toBe(true);
    expect(roleSatisfies('STAFF', 'RECEPTIONIST')).toBe(true);
  });

  it('does not let a lower role satisfy a higher requirement', () => {
    expect(roleSatisfies('STAFF', 'ADMIN')).toBe(false);
    expect(roleSatisfies('RECEPTIONIST', 'OWNER')).toBe(false);
  });

  it('treats a role as satisfying itself', () => {
    expect(roleSatisfies('ADMIN', 'ADMIN')).toBe(true);
  });
});

describe('workspace access resolution', () => {
  it('rejects an unauthenticated caller', () => {
    expect(() => resolveWorkspaceAccess(null)).toThrow(AuthorizationError);
    try {
      resolveWorkspaceAccess(null);
    } catch (e) {
      expect((e as AuthorizationError).code).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects a session with no workspace membership', () => {
    try {
      resolveWorkspaceAccess(session({ workspaces: [] }));
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as AuthorizationError).code).toBe('NO_WORKSPACE');
    }
  });

  it('defaults to the first workspace when none is requested', () => {
    expect(resolveWorkspaceAccess(session()).id).toBe('ws-owned');
  });

  it('returns the requested workspace when the session owns it', () => {
    expect(resolveWorkspaceAccess(session(), 'ws-owned').id).toBe('ws-owned');
  });

  it('refuses a workspace id the session does not belong to', () => {
    // The core tenant-isolation guarantee: a client-supplied id for someone
    // else's workspace must never resolve.
    try {
      resolveWorkspaceAccess(session(), 'ws-someone-else');
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as AuthorizationError).code).toBe('FORBIDDEN');
    }
  });

  it('does not reveal whether the refused workspace actually exists', () => {
    const forOther = (() => {
      try {
        resolveWorkspaceAccess(session(), 'ws-real-but-not-mine');
      } catch (e) {
        return (e as Error).message;
      }
    })();
    const forGarbage = (() => {
      try {
        resolveWorkspaceAccess(session(), 'ws-does-not-exist-at-all');
      } catch (e) {
        return (e as Error).message;
      }
    })();
    expect(forOther).toBe(forGarbage);
  });

  it('enforces the required role', () => {
    const staffSession = session({
      workspaces: [
        {
          id: 'ws-owned',
          name: 'Alpha',
          slug: 'alpha',
          timezone: 'UTC',
          currency: 'INR',
          role: 'STAFF',
        },
      ],
    });
    expect(() => resolveWorkspaceAccess(staffSession, 'ws-owned', 'STAFF')).not.toThrow();
    expect(() => resolveWorkspaceAccess(staffSession, 'ws-owned', 'ADMIN')).toThrow(
      AuthorizationError
    );
  });

  it('resolves by slug with the same isolation rules', () => {
    expect(resolveWorkspaceAccessBySlug(session(), 'alpha').id).toBe('ws-owned');
    expect(() => resolveWorkspaceAccessBySlug(session(), 'beta')).toThrow(AuthorizationError);
  });
});
