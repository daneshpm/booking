'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { z } from 'zod';
import { requireWorkspace, toActionError } from '@/lib/session';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export interface BookingPageActionResult {
  success: boolean;
  error?: string;
}

const brandingSchema = z.object({
  brandColor: z
    .string()
    .trim()
    .regex(HEX_COLOR_PATTERN, 'Enter a valid hex color, e.g. #5c34ad.')
    .optional()
    .nullable(),
  bookingWelcomeTitle: z.string().trim().max(120).optional().nullable(),
  bookingWelcomeMessage: z.string().trim().max(300).optional().nullable(),
});

export type BrandingInput = z.input<typeof brandingSchema>;

/** Public page theme: accent color and the intro copy shown above the service list. */
export async function updateBookingPageBrandingAction(
  workspaceId: string,
  input: BrandingInput
): Promise<BookingPageActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
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

const routingOptionSchema = z.object({
  serviceId: z.string().trim().min(1),
  label: z.string().trim().min(1, 'Give every option a label.').max(120),
});

const routingFormSchema = z
  .object({
    question: z.string().trim().min(1, 'Give the routing question some text.').max(200),
    isEnabled: z.boolean().default(false),
    options: z.array(routingOptionSchema).max(20),
  })
  .refine((data) => !data.isEnabled || data.options.length > 0, {
    message: 'Add at least one option before turning the routing form on.',
    path: ['options'],
  });

export type RoutingFormInput = z.input<typeof routingFormSchema>;

export interface RoutingFormActionResult extends BookingPageActionResult {
  fieldErrors?: Record<string, string[]>;
}

/**
 * Replaces the workspace's routing form and its options wholesale.
 *
 * There is never more than a handful of options, so deleting and recreating
 * them inside one transaction is simpler and no less correct than diffing the
 * existing set, and it means a partially-applied edit can never leave stale
 * options pointing at services the form no longer offers.
 */
export async function saveRoutingFormAction(
  workspaceId: string,
  input: RoutingFormInput
): Promise<RoutingFormActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
    const data = routingFormSchema.parse(input);

    // Every option's service must belong to this workspace: a service id
    // from another tenant must not silently attach here.
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

    // /book/[slug] renders with `dynamic = 'force-dynamic'`, so it is never
    // cached and there is nothing there to revalidate.
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
