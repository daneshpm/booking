'use server';

import { revalidatePath } from 'next/cache';
import {
  prisma,
  type WorkflowTrigger,
  type WorkflowChannel,
  type WorkflowRecipient,
} from '@bookings/database';
import { z } from 'zod';
import { requireWorkspace, toActionError } from '@/lib/session';

export interface WorkflowActionResult {
  success: boolean;
  error?: string;
  workflowId?: string;
}

const TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'BEFORE_APPOINTMENT',
  'AFTER_APPOINTMENT',
] as const;

const workflowSchema = z.object({
  name: z.string().trim().min(2, 'Give the workflow a name of at least 2 characters.').max(120),
  description: z.string().trim().max(500).optional().nullable(),
  trigger: z.enum(TRIGGERS),
  channel: z.enum(['EMAIL', 'SMS', 'WEBHOOK']),
  recipient: z.enum(['CUSTOMER', 'STAFF', 'BOTH']),
  /**
   * Minutes relative to the appointment start. Negative runs before it,
   * positive after. Capped at 30 days either way, since a reminder further out
   * than that is almost certainly a typo.
   */
  offsetMinutes: z.number().int().min(-43200).max(43200).default(0),
  subject: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().max(5000).optional().nullable(),
  webhookUrl: z.string().trim().url('Enter a valid webhook URL.').optional().nullable(),
  isActive: z.boolean().default(true),
});

export type WorkflowInput = z.input<typeof workflowSchema>;

/** Reject a webhook target that is missing, or a time trigger with no offset. */
function crossFieldError(data: z.infer<typeof workflowSchema>): string | null {
  if (data.channel === 'WEBHOOK' && !data.webhookUrl) {
    return 'A webhook workflow needs a destination URL.';
  }
  const isTimeBased = data.trigger === 'BEFORE_APPOINTMENT' || data.trigger === 'AFTER_APPOINTMENT';
  if (isTimeBased && data.offsetMinutes === 0) {
    return 'Choose how long before or after the appointment this should run.';
  }
  if (data.trigger === 'BEFORE_APPOINTMENT' && data.offsetMinutes > 0) {
    return 'A reminder before the appointment needs a negative offset.';
  }
  if (data.trigger === 'AFTER_APPOINTMENT' && data.offsetMinutes < 0) {
    return 'A follow-up after the appointment needs a positive offset.';
  }
  return null;
}

export async function createWorkflowAction(
  workspaceId: string,
  input: WorkflowInput
): Promise<WorkflowActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
    const data = workflowSchema.parse(input);

    const conflict = crossFieldError(data);
    if (conflict) return { success: false, error: conflict };

    const duplicate = await prisma.workflow.findUnique({
      where: { workspaceId_name: { workspaceId, name: data.name } },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, error: 'A workflow with this name already exists.' };
    }

    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        name: data.name,
        description: data.description || null,
        trigger: data.trigger as WorkflowTrigger,
        channel: data.channel as WorkflowChannel,
        recipient: data.recipient as WorkflowRecipient,
        offsetMinutes: data.offsetMinutes,
        subject: data.subject || null,
        body: data.body || null,
        webhookUrl: data.webhookUrl || null,
        isActive: data.isActive,
      },
      select: { id: true },
    });

    revalidatePath('/workflows');
    return { success: true, workflowId: workflow.id };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return toActionError(err);
  }
}

export async function updateWorkflowAction(
  workspaceId: string,
  workflowId: string,
  input: WorkflowInput
): Promise<WorkflowActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
    const data = workflowSchema.parse(input);

    const conflict = crossFieldError(data);
    if (conflict) return { success: false, error: conflict };

    // Scoped to the workspace so a workflow id from another tenant cannot be edited.
    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: 'Workflow not found.' };
    }

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: data.name,
        description: data.description || null,
        trigger: data.trigger as WorkflowTrigger,
        channel: data.channel as WorkflowChannel,
        recipient: data.recipient as WorkflowRecipient,
        offsetMinutes: data.offsetMinutes,
        subject: data.subject || null,
        body: data.body || null,
        webhookUrl: data.webhookUrl || null,
        isActive: data.isActive,
      },
    });

    revalidatePath('/workflows');
    return { success: true, workflowId };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.errors[0].message };
    }
    return toActionError(err);
  }
}

export async function toggleWorkflowAction(
  workspaceId: string,
  workflowId: string,
  isActive: boolean
): Promise<WorkflowActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');

    const updated = await prisma.workflow.updateMany({
      where: { id: workflowId, workspaceId },
      data: { isActive },
    });

    if (updated.count === 0) {
      return { success: false, error: 'Workflow not found.' };
    }

    revalidatePath('/workflows');
    return { success: true, workflowId };
  } catch (err) {
    return toActionError(err);
  }
}

export async function deleteWorkflowAction(
  workspaceId: string,
  workflowId: string
): Promise<WorkflowActionResult> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');

    const deleted = await prisma.workflow.deleteMany({
      where: { id: workflowId, workspaceId },
    });

    if (deleted.count === 0) {
      return { success: false, error: 'Workflow not found.' };
    }

    revalidatePath('/workflows');
    return { success: true };
  } catch (err) {
    return toActionError(err);
  }
}
