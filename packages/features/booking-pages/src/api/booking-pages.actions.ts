'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { z } from 'zod';
import { requireWorkspace, requireWorkspaceFeature, toActionError } from '@bookings/auth/next';
import {
  brandingSchema,
  routingFormSchema,
  type BrandingInput,
  type BookingPageActionResult,
  type RoutingFormInput,
  type RoutingFormActionResult,
} from './booking-pages.schema';

/** Public page theme: accent color and the intro copy shown above the service list. */
export async function updateBookingPageBrandingAction(
  workspaceId: string,
  input: BrandingInput
): Promise<BookingPageActionResult> {
  try {
    const { workspace } = await requireWorkspace(workspaceId, 'ADMIN');
    await requireWorkspaceFeature(workspace, 'bookingPages');
    const data = brandingSchema.parse(input);

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        brandColor: data.brandColor || null,
        bookingWelcomeTitle: data.bookingWelcomeTitle || null,
        bookingWelcomeMessage: data.bookingWelcomeMessage || null,
      },
    });

    revalidatePath('/booking-pages');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.issues[0].message };
    }
    return toActionError(err);
  }
}

/**
 * Replaces the workspace's routing form and its options wholesale.
 */
export async function saveRoutingFormAction(
  workspaceId: string,
  input: RoutingFormInput
): Promise<RoutingFormActionResult> {
  try {
    const { workspace } = await requireWorkspace(workspaceId, 'ADMIN');
    await requireWorkspaceFeature(workspace, 'bookingPages');
    const data = routingFormSchema.parse(input);

    const serviceIds = [...new Set(data.options.map((o) => o.serviceId))];
    if (serviceIds.length > 0) {
      const owned = await prisma.service.count({
        where: { id: { in: serviceIds }, workspaceId },
      });
      if (owned !== serviceIds.length) {
        return { success: false, error: 'One of the selected services was not found.' };
      }
    }

    await prisma.$transaction(async (tx) => {
      const form = await tx.routingForm.upsert({
        where: { workspaceId },
        create: {
          workspaceId,
          question: data.question,
          isEnabled: data.isEnabled,
        },
        update: {
          question: data.question,
          isEnabled: data.isEnabled,
        },
      });

      await tx.routingFormOption.deleteMany({ where: { routingFormId: form.id } });
      if (data.options.length > 0) {
        await tx.routingFormOption.createMany({
          data: data.options.map((option, index) => ({
            routingFormId: form.id,
            serviceId: option.serviceId,
            label: option.label,
            sortOrder: index,
          })),
        });
      }
    });

    revalidatePath('/booking-pages');
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of err.issues) {
        const key = issue.path.join('.') || 'form';
        fieldErrors[key] = [...(fieldErrors[key] || []), issue.message];
      }
      return { success: false, error: err.issues[0].message, fieldErrors };
    }
    return toActionError(err);
  }
}
