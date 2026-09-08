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
    if (message) console.error('Service action failed:', message);
    return fallback;
  }
  return message;
}

/**
 * Accept a category id only when it belongs to this workspace.
 *
 * The id arrives from a form, and service categories are per-workspace. An
 * unchecked id from another tenant would be stored and then rendered on this
 * workspace's public booking page, leaking the other tenant's category name.
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
  return owned?.id;
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
    return {
      success: false,
      error: 'Validation failed. Please check form fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await createServiceUseCase.execute({
    workspaceId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    categoryId: await scopeCategoryId(workspaceId, parsed.data.categoryId),
    durationMinutes: parsed.data.durationMinutes,
    bufferBeforeMinutes: parsed.data.bufferBeforeMinutes,
    bufferAfterMinutes: parsed.data.bufferAfterMinutes,
    price: parsed.data.price,
    currency: parsed.data.currency,
    locationType: parsed.data.locationType,
    locationDetails: parsed.data.locationDetails,
    isActive: parsed.data.isActive,
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

  revalidatePath('/services');
  return {
    success: true,
    data: result.getValue(),
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
    return {
      success: false,
      error: 'Validation failed. Please check form fields.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const result = await updateServiceUseCase.execute({
    id,
    workspaceId,
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description,
    categoryId: await scopeCategoryId(workspaceId, parsed.data.categoryId),
    durationMinutes: parsed.data.durationMinutes,
    bufferBeforeMinutes: parsed.data.bufferBeforeMinutes,
    bufferAfterMinutes: parsed.data.bufferAfterMinutes,
    price: parsed.data.price,
    currency: parsed.data.currency,
    locationType: parsed.data.locationType,
    locationDetails: parsed.data.locationDetails,
    isActive: parsed.data.isActive,
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

  revalidatePath('/services');
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
