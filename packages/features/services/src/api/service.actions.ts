'use server';

import { revalidatePath } from 'next/cache';
import { requireWorkspace, toActionError } from '@bookings/auth/next';
import { prisma } from '@bookings/database';
import { PrismaServiceRepository } from '../infrastructure/repositories/PrismaServiceRepository';
import { CreateServiceUseCase } from '../application/create-service/CreateServiceUseCase';
import { UpdateServiceUseCase } from '../application/update-service/UpdateServiceUseCase';
import { DeleteServiceUseCase } from '../application/delete-service/DeleteServiceUseCase';
import { GetServicesUseCase } from '../application/get-services/GetServicesUseCase';
import { GetServiceByIdUseCase } from '../application/get-service-by-id/GetServiceByIdUseCase';
import { serviceFormSchema, type ServiceFormData } from './service.schema';
import type { ServiceOutputDTO } from '../application/create-service/CreateServiceDTO';
import { logger } from '@bookings/core';

// Instantiate dependency injection container for services feature
const serviceRepository = new PrismaServiceRepository();
const createServiceUseCase = new CreateServiceUseCase(serviceRepository);
const updateServiceUseCase = new UpdateServiceUseCase(serviceRepository);
const deleteServiceUseCase = new DeleteServiceUseCase(serviceRepository);
const getServicesUseCase = new GetServicesUseCase(serviceRepository);
const getServiceByIdUseCase = new GetServiceByIdUseCase(serviceRepository);

/**
 * Map a use-case failure to a message safe to show a browser.
 *
 * A use case wraps whatever was thrown, so a Prisma error would otherwise
 * reach the client naming internal tables, columns and constraints.
 */
function safeErrorMessage(err: { message?: string } | undefined, fallback: string): string {
  const message = err?.message ?? '';
  // Domain rules phrase their own errors for people; anything mentioning
  // database internals is replaced.
  const looksInternal =
    /prisma|invalid `|constraint|column|relation|P\d{4}|\bSQL\b/i.test(message) ||
    message.length > 200;
  if (!message || looksInternal) {
    if (message) logger.error('Service action failed', { err: message });
    return fallback;
  }
  return message;
}

/** Thrown by scopeCategoryId when a category id was given but doesn't belong to this workspace. */
class CategoryNotFoundError extends Error {
  constructor() {
    super('CATEGORY_NOT_FOUND');
  }
}

/**
 * Accept a category id only when it belongs to this workspace.
 *
 * The id arrives from a form, and service categories are per-workspace. An
 * unchecked id from another tenant would be stored and then rendered on this
 * workspace's public booking page, leaking the other tenant's category name.
 * A category id that was given but doesn't resolve throws rather than
 * quietly falling back to "no category": silently clearing whatever the
 * caller actually chose is a worse failure mode than reporting the error.
 */
async function scopeCategoryId(
  workspaceId: string,
  categoryId: string | null | undefined
): Promise<string | undefined> {
  if (!categoryId) return undefined;
  const owned = await prisma.serviceCategory.findFirst({
    where: { id: categoryId, workspaceId },
    select: { id: true },
  });
  if (!owned) throw new CategoryNotFoundError();
  return owned.id;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  fieldErrors?: Record<string, string[]>;
}

export async function createServiceAction(
  workspaceId: string,
  formData: ServiceFormData
): Promise<ActionResponse<ServiceOutputDTO>> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
  } catch (err) {
    return toActionError(err);
  }

  const parsed = serviceFormSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    for (const issue of parsed.error.issues) {
      if (issue.path.length > 0) {
        const pathKey = issue.path.join('.');
        if (!fieldErrors[pathKey]) fieldErrors[pathKey] = [];
        fieldErrors[pathKey].push(issue.message);
      }
    }
    return {
      success: false,
      error: 'Validation failed. Please check form fields.',
      fieldErrors,
    };
  }

  let categoryId: string | undefined;
  try {
    categoryId = await scopeCategoryId(workspaceId, parsed.data.categoryId);
  } catch {
    return { success: false, error: 'The selected category could not be found.' };
  }

  const result = await createServiceUseCase.execute({
    workspaceId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    categoryId,
    durationMinutes: parsed.data.durationMinutes,
    bufferBeforeMinutes: parsed.data.bufferBeforeMinutes,
    bufferAfterMinutes: parsed.data.bufferAfterMinutes,
    price: parsed.data.price,
    currency: parsed.data.currency,
    locationType: parsed.data.locationType,
    locationDetails: parsed.data.locationDetails,
    isActive: parsed.data.isActive,
    hasYieldPricing: parsed.data.hasYieldPricing,
    yieldDiscountPercent: parsed.data.yieldDiscountPercent,
    yieldDays: parsed.data.yieldDays,
    yieldStartTime: parsed.data.yieldStartTime,
    yieldEndTime: parsed.data.yieldEndTime,
    yieldLabel: parsed.data.yieldLabel,
    intakeQuestions: parsed.data.intakeQuestions,
    addons: parsed.data.addons,
    routingStrategy: parsed.data.routingStrategy,
    capacity: parsed.data.capacity,
  });

  if (result.isFailure) {
    return {
      success: false,
      error: safeErrorMessage(
        result.getError(),
        'Could not complete that action. Please try again.'
      ),
    };
  }

  const createdService = result.getValue();

  if (parsed.data.assignedStaffIds && parsed.data.assignedStaffIds.length > 0) {
    const validStaff = await prisma.staff.findMany({
      where: { id: { in: parsed.data.assignedStaffIds }, workspaceId, isActive: true },
      select: { id: true },
    });
    if (validStaff.length > 0) {
      await prisma.serviceStaff.createMany({
        data: validStaff.map((s) => ({
          serviceId: createdService.id,
          staffId: s.id,
        })),
        skipDuplicates: true,
      });
    }
  }

  revalidatePath('/services');
  revalidatePath('/staff');
  revalidatePath('/users');
  revalidatePath('/availability');
  revalidatePath('/schedules');
  return {
    success: true,
    data: createdService,
  };
}

export async function updateServiceAction(
  workspaceId: string,
  id: string,
  formData: ServiceFormData
): Promise<ActionResponse<ServiceOutputDTO>> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
  } catch (err) {
    return toActionError(err);
  }

  const parsed = serviceFormSchema.safeParse(formData);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>;
    for (const issue of parsed.error.issues) {
      if (issue.path.length > 0) {
        const pathKey = issue.path.join('.');
        if (!fieldErrors[pathKey]) fieldErrors[pathKey] = [];
        fieldErrors[pathKey].push(issue.message);
      }
    }
    return {
      success: false,
      error: 'Validation failed. Please check form fields.',
      fieldErrors,
    };
  }

  let categoryId: string | undefined;
  try {
    categoryId = await scopeCategoryId(workspaceId, parsed.data.categoryId);
  } catch {
    return { success: false, error: 'The selected category could not be found.' };
  }

  const result = await updateServiceUseCase.execute({
    id,
    workspaceId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    categoryId,
    durationMinutes: parsed.data.durationMinutes,
    bufferBeforeMinutes: parsed.data.bufferBeforeMinutes,
    bufferAfterMinutes: parsed.data.bufferAfterMinutes,
    price: parsed.data.price,
    currency: parsed.data.currency,
    locationType: parsed.data.locationType,
    locationDetails: parsed.data.locationDetails,
    isActive: parsed.data.isActive,
    hasYieldPricing: parsed.data.hasYieldPricing,
    yieldDiscountPercent: parsed.data.yieldDiscountPercent,
    yieldDays: parsed.data.yieldDays,
    yieldStartTime: parsed.data.yieldStartTime,
    yieldEndTime: parsed.data.yieldEndTime,
    yieldLabel: parsed.data.yieldLabel,
    intakeQuestions: parsed.data.intakeQuestions,
    addons: parsed.data.addons,
    routingStrategy: parsed.data.routingStrategy,
    capacity: parsed.data.capacity,
  });

  if (result.isFailure) {
    return {
      success: false,
      error: safeErrorMessage(
        result.getError(),
        'Could not complete that action. Please try again.'
      ),
    };
  }

  if (parsed.data.assignedStaffIds !== undefined) {
    const activeWorkspaceStaff = await prisma.staff.findMany({
      where: { workspaceId, isActive: true },
      select: { id: true },
    });
    const activeIds = activeWorkspaceStaff.map((s) => s.id);
    const validIds = parsed.data.assignedStaffIds.filter((sid) => activeIds.includes(sid));

    await prisma.$transaction([
      // Scoped to currently-active staff: an inactive staff member is not
      // shown as a checkbox in the edit form at all, so their assignment can
      // never appear in a submitted list. Deleting by plain "not in the
      // submitted list" would treat that invisibility as "explicitly
      // unchecked" and silently, permanently drop the assignment the next
      // time any unrelated field on the service is saved.
      prisma.serviceStaff.deleteMany({
        where: { serviceId: id, staffId: { notIn: validIds, in: activeIds } },
      }),
      ...(validIds.length > 0
        ? [
            prisma.serviceStaff.createMany({
              data: validIds.map((staffId) => ({
                serviceId: id,
                staffId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);
  }

  revalidatePath('/services');
  revalidatePath('/staff');
  revalidatePath('/users');
  revalidatePath('/availability');
  revalidatePath('/schedules');
  return {
    success: true,
    data: result.getValue(),
  };
}

export async function deleteServiceAction(
  workspaceId: string,
  id: string
): Promise<ActionResponse<void>> {
  try {
    await requireWorkspace(workspaceId, 'ADMIN');
  } catch (err) {
    return toActionError(err);
  }

  const result = await deleteServiceUseCase.execute({ workspaceId, id });
  if (result.isFailure) {
    return {
      success: false,
      error: safeErrorMessage(
        result.getError(),
        'Could not complete that action. Please try again.'
      ),
    };
  }

  revalidatePath('/services');
  return {
    success: true,
  };
}

export async function getServicesAction(
  workspaceId: string
): Promise<ActionResponse<ServiceOutputDTO[]>> {
  try {
    await requireWorkspace(workspaceId);
  } catch (err) {
    return toActionError(err);
  }

  const result = await getServicesUseCase.execute({ workspaceId });
  if (result.isFailure) {
    return {
      success: false,
      error: safeErrorMessage(
        result.getError(),
        'Could not complete that action. Please try again.'
      ),
    };
  }

  return {
    success: true,
    data: result.getValue(),
  };
}

export async function getServiceByIdAction(
  workspaceId: string,
  id: string
): Promise<ActionResponse<ServiceOutputDTO>> {
  try {
    await requireWorkspace(workspaceId);
  } catch (err) {
    return toActionError(err);
  }

  const result = await getServiceByIdUseCase.execute({ workspaceId, id });
  if (result.isFailure) {
    return {
      success: false,
      error: safeErrorMessage(
        result.getError(),
        'Could not complete that action. Please try again.'
      ),
    };
  }

  return {
    success: true,
    data: result.getValue(),
  };
}
