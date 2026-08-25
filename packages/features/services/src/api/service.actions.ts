'use server';

import { revalidatePath } from 'next/cache';
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
    categoryId: parsed.data.categoryId || undefined,
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
      error: result.getError().message,
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
    categoryId: parsed.data.categoryId || undefined,
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
      error: result.getError().message,
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
  const result = await deleteServiceUseCase.execute({ workspaceId, id });
  if (result.isFailure) {
    return {
      success: false,
      error: result.getError().message,
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
  const result = await getServicesUseCase.execute({ workspaceId });
  if (result.isFailure) {
    return {
      success: false,
      error: result.getError().message,
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
  const result = await getServiceByIdUseCase.execute({ workspaceId, id });
  if (result.isFailure) {
    return {
      success: false,
      error: result.getError().message,
    };
  }

  return {
    success: true,
    data: result.getValue(),
  };
}
