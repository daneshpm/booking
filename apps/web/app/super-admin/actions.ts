'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BillingStatus } from '@bookings/database';
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
  isActive: boolean;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
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
        isActive: true,
        billingStatus: true,
        trialEndsAt: true,
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
      isActive: w.isActive,
      billingStatus: w.billingStatus,
      trialEndsAt: w.trialEndsAt?.toISOString() ?? null,
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

/**
 * Soft-deletes (or restores) an organization. A deactivated workspace is
 * dropped from its members' sessions and its public booking page 404s, but
 * every booking, customer and staff record stays intact — see
 * Workspace.isActive in the schema.
 */
export async function setOrganizationActiveAction(
  workspaceId: string,
  isActive: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requirePlatformAdmin();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { isActive },
    });

    revalidatePath('/super-admin');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

/**
 * Manually flips an organization between Trial and Subscribed. There is no
 * payment processor wired up for organization-level billing today, so this is
 * the entire mechanism: a platform admin marks an org Subscribed by hand once
 * payment happens through whatever real-world process is actually used.
 */
export async function updateBillingStatusAction(
  workspaceId: string,
  billingStatus: BillingStatus
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requirePlatformAdmin();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        billingStatus,
        // Subscribed orgs aren't on a trial clock; reactivating a trial from
        // here would need a new end date set explicitly, not a stale old one.
        trialEndsAt: billingStatus === 'SUBSCRIBED' ? null : undefined,
      },
    });

    revalidatePath('/super-admin');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}
