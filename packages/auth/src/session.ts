import { prisma } from '@bookings/database';
import type { Role } from '@bookings/database';
import { SESSION_COOKIE, SESSION_TTL_DAYS, generateSessionToken, hashSessionToken } from './tokens';

export { SESSION_COOKIE, SESSION_TTL_DAYS, generateSessionToken, hashSessionToken } from './tokens';
export { safeCompareDigest } from './tokens';

/**
 * Sessions are refreshed at most once per this interval. Without a floor, every
 * authenticated request would issue a database write just to bump a timestamp.
 */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface SessionWorkspace {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  timezone: string;
  currency: string;
  role: Role;
}

export interface AuthSession {
  sessionId: string;
  user: SessionUser;
  /** Every workspace this user belongs to, ordered by name. */
  workspaces: SessionWorkspace[];
  expiresAt: Date;
}

export interface CreateSessionOptions {
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  ttlDays?: number;
}

export interface CreatedSession {
  token: string;
  expiresAt: Date;
  sessionId: string;
}

/** Issue a new session and return the plaintext token exactly once. */
export async function createSession(options: CreateSessionOptions): Promise<CreatedSession> {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const ttlDays = options.ttlDays ?? SESSION_TTL_DAYS;
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const session = await prisma.session.create({
    data: {
      userId: options.userId,
      tokenHash,
      expiresAt,
      userAgent: options.userAgent?.slice(0, 500) ?? null,
      ipAddress: options.ipAddress ?? null,
    },
    select: { id: true },
  });

  return { token, expiresAt, sessionId: session.id };
}

/**
 * Resolve a session token to the authenticated user and their workspaces.
 *
 * Returns null for an unknown, expired, or deactivated-user token. Expired rows
 * are deleted on sight so the table does not grow without bound.
 */
export async function resolveSession(
  token: string | undefined | null
): Promise<AuthSession | null> {
  if (!token) return null;

  const tokenHash = hashSessionToken(token);

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: {
      user: {
        include: {
          memberships: {
            include: { workspace: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (!session.user.isActive) {
    // A deactivated account's sessions are useless; drop them all.
    await prisma.session.deleteMany({ where: { userId: session.userId } }).catch(() => undefined);
    return null;
  }

  if (Date.now() - session.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  const workspaces: SessionWorkspace[] = session.user.memberships
    .map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      logoUrl: m.workspace.logoUrl,
      timezone: m.workspace.timezone,
      currency: m.workspace.currency,
      role: m.role,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
    },
    workspaces,
    expiresAt: session.expiresAt,
  };
}

/** Revoke a single session by its token. Safe to call with an unknown token. */
export async function destroySession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
}

/** Revoke every session belonging to a user, e.g. after a password change. */
export async function destroyAllUserSessions(userId: string): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { userId } });
  return result.count;
}

/** Delete expired rows. Intended to be called from a scheduled job. */
export async function purgeExpiredSessions(now: Date = new Date()): Promise<number> {
  const result = await prisma.session.deleteMany({ where: { expiresAt: { lte: now } } });
  return result.count;
}
