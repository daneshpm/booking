'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { z } from 'zod';
import { requireWorkspace, toActionError } from '@/lib/session';

/**
 * Reject a timezone the scheduling engine cannot resolve.
 *
 * Availability, buffers and reminders are all computed in the workspace
 * timezone, so an unrecognised value would break every slot calculation with a
 * runtime error far away from where it was set.
 */
function isValidTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const settingsSchema = z.object({
  name: z.string().trim().min(2, 'Organization name must be at least 2 characters'),
  timezone: z
    .string()
    .trim()
    .min(1, 'Timezone is required')
    .refine(isValidTimezone, 'Please choose a valid IANA timezone, for example Asia/Kolkata.'),
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Currency must be a three-letter ISO code, for example INR.'),
});

export async function updateWorkspaceSettingsAction(
  workspaceId: string,
  data: { name: string; timezone: string; currency: string }
) {
  try {
    // Only an administrator can change workspace-wide settings.
    await requireWorkspace(workspaceId, 'ADMIN');

    const validated = settingsSchema.parse(data);

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: validated.name,
        timezone: validated.timezone,
        currency: validated.currency,
      },
    });

    revalidatePath('/settings');
    revalidatePath('/services');
    revalidatePath('/staff');
    revalidatePath('/availability');
    revalidatePath('/book');

    return { success: true, data: updated };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return toActionError(err);
  }
}
