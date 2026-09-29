'use server';

import { prisma } from '@bookings/database';
import { requirePlatformAdmin, toActionError } from '@/lib/session';

/**
 * The platform-admin organisation list.
 *
 * This is the one deliberate exception to tenant isolation in the whole
 * codebase: every other server action scopes its query to a single workspace
 * resolved by requireWorkspace(). This one reads across all of them, which is
 * exactly why it calls requirePlatformAdmin() first and nothing else in this
 * file may skip that call.
 */
export interface OrganizationSummary {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  ownerEmail: string | null;
  memberCount: number;
  staffCount: number;
  serviceCount: number;
  bookingCount: number;
  lastBookingAt: string | null;
}

export async function getOrganizationsAction(): Promise<
  { success: true; organizations: OrganizationSummary[] } | { success: false; error: string }
> {
  try {
    await requirePlatformAdmin();

    const workspaces = await prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        createdAt: true,
        members: {
          where: { role: 'OWNER' },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { user: { select: { email: true } } },
        },
        _count: { select: { members: true, staff: true, services: true, bookings: true } },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    const organizations: OrganizationSummary[] = workspaces.map((w) => ({
      id: w.id,
      name: w.name,
      slug: w.slug,
      createdAt: w.createdAt.toISOString(),
      ownerEmail: w.members[0]?.user.email ?? null,
      memberCount: w._count.members,
      staffCount: w._count.staff,
      serviceCount: w._count.services,
      bookingCount: w._count.bookings,
      lastBookingAt: w.bookings[0]?.createdAt.toISOString() ?? null,
    }));

    return { success: true, organizations };
  } catch (err) {
    // requirePlatformAdmin() redirects rather than throws when this is called
    // during a page render; called from client-side JS (a real "action"), it
    // throws AuthorizationError instead, which toActionError converts to a
    // safe message here — never a raw database error.
    return toActionError(err);
  }
}
