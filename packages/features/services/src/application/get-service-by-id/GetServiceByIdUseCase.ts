import { Result, NotFoundError } from '@bookings/core';
import type { IServiceRepository } from '../../domain/repositories/IServiceRepository';
import type { ServiceOutputDTO } from '../create-service/CreateServiceDTO';

export class GetServiceByIdUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  public async execute(params: {
    workspaceId: string;
    id?: string;
    slug?: string;
  }): Promise<Result<ServiceOutputDTO, Error>> {
    try {
      let service = null;
      if (params.id) {
        service = await this.serviceRepo.findById(params.workspaceId, params.id);
      } else if (params.slug) {
        service = await this.serviceRepo.findBySlug(params.workspaceId, params.slug);
      }

      if (!service) {
        return Result.fail(new NotFoundError('Service', params.id || params.slug));
      }

      const dto: ServiceOutputDTO = {
        id: service.id,
        workspaceId: service.workspaceId,
        categoryId: service.categoryId,
        name: service.name,
        slug: service.slug,
        description: service.description,
        durationMinutes: service.duration.minutes,
        formattedDuration: service.duration.format(),
        bufferBeforeMinutes: service.buffer.beforeMinutes,
        bufferAfterMinutes: service.buffer.afterMinutes,
        price: service.pricing.amount,
        currency: service.pricing.currency,
        formattedPrice: service.pricing.format(),
        locationType: service.locationType,
        locationDetails: service.locationDetails,
        isActive: service.isActive,
        hasYieldPricing: service.hasYieldPricing,
        yieldDiscountPercent: service.yieldDiscountPercent,
        yieldDays: service.yieldDays,
        yieldStartTime: service.yieldStartTime,
        yieldEndTime: service.yieldEndTime,
        yieldLabel: service.yieldLabel,
        intakeQuestions: service.intakeQuestions,
        addons: service.addons,
        routingStrategy: service.routingStrategy,
        capacity: service.capacity,
        createdAt: service.createdAt.toISOString(),
        updatedAt: service.updatedAt.toISOString(),
      };

      return Result.ok(dto);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
