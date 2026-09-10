import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { session, workspace: access } = await requireWorkspace(null, 'ADMIN');

  const [workspace, user, staffProfile, userSessions, members, staffList] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: access.id } }),
    prisma.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        gender: true,
        country: true,
        state: true,
        language: true,
        timezone: true,
        bio: true,
        headline: true,
        instagram: true,
        linkedin: true,
        twitter: true,
        website: true,
        createdAt: true,
      },
    }),
    prisma.staff.findFirst({
      where: {
        workspaceId: access.id,
        OR: [{ userId: session.user.id }, { email: session.user.email }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        timezone: true,
      },
    }),
    prisma.session.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        userAgent: true,
        ipAddress: true,
      },
      orderBy: { lastUsedAt: 'desc' },
      take: 10,
    }),
    prisma.workspaceMember.findMany({
      where: { workspaceId: access.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            displayName: true,
            email: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.staff.findMany({
      where: { workspaceId: access.id },
      include: {
        serviceAssignments: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedSessions = userSessions.map((s) => ({
    id: s.id,
    createdAt: s.createdAt.toISOString(),
    lastUsedAt: s.lastUsedAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    userAgent: s.userAgent,
    ipAddress: s.ipAddress,
    isCurrent: s.id === session.sessionId,
  }));

  // Consolidate workspace members and staff into a unified directory
  const memberMap = new Map<
    string,
    {
      id: string;
      name: string;
      email: string;
      role: string;
      avatarUrl: string | null;
      phone: string | null;
      isActive: boolean;
      isCurrentUser: boolean;
      services: string[];
      joinedAt: string;
    }
  >();

  for (const m of members) {
    memberMap.set(m.user.email.toLowerCase(), {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      avatarUrl: m.user.avatarUrl,
      phone: m.user.phone,
      isActive: true,
      isCurrentUser: m.user.id === session.user.id,
      services: [],
      joinedAt: m.createdAt.toISOString(),
    });
  }

  for (const s of staffList) {
    const existing = memberMap.get(s.email.toLowerCase());
    const serviceNames = s.serviceAssignments.map((sa) => sa.service.name);
    if (existing) {
      existing.services = serviceNames;
      if (!existing.phone) existing.phone = s.phone;
      if (!existing.avatarUrl) existing.avatarUrl = s.avatarUrl;
      existing.isActive = s.isActive;
    } else {
      memberMap.set(s.email.toLowerCase(), {
        id: s.id,
        name: s.name,
        email: s.email,
        role: 'STAFF',
        avatarUrl: s.avatarUrl,
        phone: s.phone,
        isActive: s.isActive,
        isCurrentUser: s.email.toLowerCase() === session.user.email.toLowerCase(),
        services: serviceNames,
        joinedAt: s.createdAt.toISOString(),
      });
    }
  }

  const workspaceUsers = Array.from(memberMap.values());

  return (
    <div className="min-h-full bg-slate-50 dark:bg-slate-950">
      <SettingsClient
        workspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          logoUrl: workspace.logoUrl,
          timezone: workspace.timezone,
          currency: workspace.currency,
        }}
        user={{
          ...user,
          createdAt: user.createdAt.toISOString(),
        }}
        staffProfile={staffProfile}
        sessions={serializedSessions}
        workspaceUsers={workspaceUsers}
        currentSessionId={session.sessionId}
        role={access.role}
      />
    </div>
  );
}
