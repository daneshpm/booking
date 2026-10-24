'use server';

import { revalidatePath } from 'next/cache';
import {
  prisma,
  type WorkflowTrigger,
  type WorkflowChannel,
  type WorkflowRecipient,
} from '@bookings/database';
import { z } from 'zod';
import { requireWorkspace, requireWorkspaceFeature, toActionError } from '@bookings/auth/next';
import {
  workflowSchema,
  validateWorkflowCrossFields,
  type WorkflowInput,
  type WorkflowActionResult,
} from './workflow.schema';

/**
 * Resolves a workflow's service scope, or null for every service in the
 * workspace. Re-checked against the workspace rather than trusted as-is: a
 * service id from another tenant must not silently attach here.
 */
async function resolveServiceId(
  workspaceId: string,
  serviceId: string | null | undefined
): Promise<{ ok: true; serviceId: string | null } | { ok: false; error: string }> {
  if (!serviceId) return { ok: true, serviceId: null };

  const service = await prisma.service.findFirst({
    where: { id: serviceId, workspaceId },
    select: { id: true },
  });
  if (!service) {
    return { ok: false, error: 'Selected service was not found in this workspace.' };
  }
  return { ok: true, serviceId: service.id };
}

export async function createWorkflowAction(
  workspaceId: string,
  input: WorkflowInput
): Promise<WorkflowActionResult> {
  try {
    const { workspace } = await requireWorkspace(workspaceId, 'ADMIN');
    await requireWorkspaceFeature(workspace, 'workflows');
    const data = workflowSchema.parse(input);

    const conflict = validateWorkflowCrossFields(data);
    if (conflict) return { success: false, error: conflict };

    const duplicate = await prisma.workflow.findUnique({
      where: { workspaceId_name: { workspaceId, name: data.name } },
      select: { id: true },
    });
    if (duplicate) {
      return { success: false, error: 'A workflow with this name already exists.' };
    }

    const scope = await resolveServiceId(workspaceId, data.serviceId);
    if (!scope.ok) return { success: false, error: scope.error };

    const workflow = await prisma.workflow.create({
      data: {
        workspaceId,
        serviceId: scope.serviceId,
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
      return { success: false, error: err.issues[0].message };
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
    const { workspace } = await requireWorkspace(workspaceId, 'ADMIN');
    await requireWorkspaceFeature(workspace, 'workflows');
    const data = workflowSchema.parse(input);

    const conflict = validateWorkflowCrossFields(data);
    if (conflict) return { success: false, error: conflict };

    const existing = await prisma.workflow.findFirst({
      where: { id: workflowId, workspaceId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: 'Workflow not found.' };
    }

    const scope = await resolveServiceId(workspaceId, data.serviceId);
    if (!scope.ok) return { success: false, error: scope.error };

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        serviceId: scope.serviceId,
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
      return { success: false, error: err.issues[0].message };
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
    const { workspace } = await requireWorkspace(workspaceId, 'ADMIN');
    await requireWorkspaceFeature(workspace, 'workflows');

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
    const { workspace } = await requireWorkspace(workspaceId, 'ADMIN');
    await requireWorkspaceFeature(workspace, 'workflows');

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
