'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@bookings/database';
import { z } from 'zod';

const settingsSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().min(1, 'Currency is required'),
});

export async function updateWorkspaceSettingsAction(
  workspaceId: string,
  data: { name: string; timezone: string; currency: string }
) {
  try {
    const validated = settingsSchema.parse(data);

    const updated = await prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        name: validated.name.trim(),
        timezone: validated.timezone.trim(),
        currency: validated.currency.trim(),
      },
    });

    revalidatePath('/settings');
    revalidatePath('/services');
    revalidatePath('/staff');
    revalidatePath('/availability');
    revalidatePath('/book');

    return { success: true, data: updated };
  } catch (err: any) {
    console.error('Error updating settings:', err);
    return {
      success: false,
      error: err instanceof z.ZodError ? err.errors[0].message : err.message || 'Failed to update settings',
    };
  }
}
