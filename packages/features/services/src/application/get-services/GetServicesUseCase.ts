import { Result } from '@bookings/core';
import type { IServiceRepository } from '../../domain/repositories/IServiceRepository';
import type { ServiceOutputDTO } from '../create-service/CreateServiceDTO';

export class GetServicesUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  public async execute(params: {
    workspaceId: string;
    categoryId?: string;
    isActive?: boolean;
  }): Promise<Result<ServiceOutputDTO[], Error>> {
    try {
      const services = await this.serviceRepo.findAllByWorkspace(params.workspaceId, {
        categoryId: params.categoryId,
        isActive: params.isActive,
      });

      const dtos: ServiceOutputDTO[] = services.map((s) => ({
        id: s.id,
        workspaceId: s.workspaceId,
        categoryId: s.categoryId,
        name: s.name,
        slug: s.slug,
        description: s.description,
        durationMinutes: s.duration.minutes,
        formattedDuration: s.duration.format(),
        bufferBeforeMinutes: s.buffer.beforeMinutes,
        bufferAfterMinutes: s.buffer.afterMinutes,
        price: s.pricing.amount,
        currency: s.pricing.currency,
        formattedPrice: s.pricing.format(),
        locationType: s.locationType,
        locationDetails: s.locationDetails,
        isActive: s.isActive,
        hasYieldPricing: s.hasYieldPricing,
        yieldDiscountPercent: s.yieldDiscountPercent,
        yieldDays: s.yieldDays,
        yieldStartTime: s.yieldStartTime,
        yieldEndTime: s.yieldEndTime,
        yieldLabel: s.yieldLabel,
        intakeQuestions: s.intakeQuestions,
        addons: s.addons,
        routingStrategy: s.routingStrategy,
        capacity: s.capacity,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      return Result.ok(dtos);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
