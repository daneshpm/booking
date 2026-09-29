'use server';

import { revalidatePath } from 'next/cache';
import { prisma, type BillingStatus, type BillingPeriod } from '@bookings/database';
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
  workflowsEnabled: boolean;
  analyticsEnabled: boolean;
  dataExportEnabled: boolean;
  bookingPagesEnabled: boolean;
}

/** A single feature module a platform admin can enable/disable per organization. */
export type OrganizationFeature =
  | 'workflowsEnabled'
  | 'analyticsEnabled'
  | 'dataExportEnabled'
  | 'bookingPagesEnabled';

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
        workflowsEnabled: true,
        analyticsEnabled: true,
        dataExportEnabled: true,
        bookingPagesEnabled: true,
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
      workflowsEnabled: w.workflowsEnabled,
      analyticsEnabled: w.analyticsEnabled,
      dataExportEnabled: w.dataExportEnabled,
      bookingPagesEnabled: w.bookingPagesEnabled,
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

/**
 * Turns a single feature module on or off for one organization. Enforced by
 * requireWorkspaceFeature() at every page and action the feature gates, not
 * just here — this only sets the flag those checks read.
 */
export async function updateOrganizationFeatureAction(
  workspaceId: string,
  feature: OrganizationFeature,
  enabled: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requirePlatformAdmin();

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { [feature]: enabled },
    });

    revalidatePath('/super-admin');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

/**
 * Marketing pricing plans for the public landing page. Purely descriptive —
 * see the comment on the Plan model for why this has no link to any real
 * organization's billing.
 */
export interface PlanSummary {
  id: string;
  name: string;
  price: string;
  currency: string;
  billingPeriod: BillingPeriod;
  features: string[];
  displayOrder: number;
  isPublished: boolean;
}

export interface PlanInput {
  name: string;
  price: string;
  currency: string;
  billingPeriod: BillingPeriod;
  features: string[];
  displayOrder: number;
  isPublished: boolean;
}

function serializePlan(p: {
  id: string;
  name: string;
  price: unknown;
  currency: string;
  billingPeriod: BillingPeriod;
  features: string[];
  displayOrder: number;
  isPublished: boolean;
}): PlanSummary {
  return {
    id: p.id,
    name: p.name,
    // Prisma's Decimal.toString() drops trailing zeros (999 rather than
    // 999.00); a price is always shown to 2 places regardless of what got
    // typed in.
    price: Number(p.price).toFixed(2),
    currency: p.currency,
    billingPeriod: p.billingPeriod,
    features: p.features,
    displayOrder: p.displayOrder,
    isPublished: p.isPublished,
  };
}

export async function getPlansAction(): Promise<
  { success: true; plans: PlanSummary[] } | { success: false; error: string }
> {
  try {
    await requirePlatformAdmin();
    const plans = await prisma.plan.findMany({ orderBy: { displayOrder: 'asc' } });
    return { success: true, plans: plans.map(serializePlan) };
  } catch (err) {
    return toActionError(err);
  }
}

function validatePlanInput(input: PlanInput): string | null {
  if (!input.name.trim()) return 'Plan name is required.';
  if (!/^\d+(\.\d{1,2})?$/.test(input.price.trim())) return 'Enter a valid price, e.g. 999.00.';
  if (!input.currency.trim()) return 'Currency is required.';
  return null;
}

export async function createPlanAction(
  input: PlanInput
): Promise<{ success: true; planId: string } | { success: false; error: string }> {
  try {
    await requirePlatformAdmin();

    const error = validatePlanInput(input);
    if (error) return { success: false, error };

    const plan = await prisma.plan.create({
      data: {
        name: input.name.trim(),
        price: input.price.trim(),
        currency: input.currency.trim().toUpperCase(),
        billingPeriod: input.billingPeriod,
        features: input.features.map((f) => f.trim()).filter(Boolean),
        displayOrder: input.displayOrder,
        isPublished: input.isPublished,
      },
      select: { id: true },
    });

    revalidatePath('/super-admin/plans');
    revalidatePath('/');
    return { success: true, planId: plan.id };
  } catch (err) {
    return toActionError(err);
  }
}

export async function updatePlanAction(
  planId: string,
  input: PlanInput
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requirePlatformAdmin();

    const error = validatePlanInput(input);
    if (error) return { success: false, error };

    await prisma.plan.update({
      where: { id: planId },
      data: {
        name: input.name.trim(),
        price: input.price.trim(),
        currency: input.currency.trim().toUpperCase(),
        billingPeriod: input.billingPeriod,
        features: input.features.map((f) => f.trim()).filter(Boolean),
        displayOrder: input.displayOrder,
        isPublished: input.isPublished,
      },
    });

    revalidatePath('/super-admin/plans');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deletePlanAction(
  planId: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    await requirePlatformAdmin();

    await prisma.plan.delete({ where: { id: planId } });

    revalidatePath('/super-admin/plans');
    revalidatePath('/');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}
