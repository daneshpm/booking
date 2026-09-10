import slugify from 'slugify';
import { Result, ConflictError } from '@bookings/core';
import { Service } from '../../domain/entities/Service';
import type { IServiceRepository } from '../../domain/repositories/IServiceRepository';
import type { CreateServiceInputDTO, ServiceOutputDTO } from './CreateServiceDTO';

export class CreateServiceUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  public async execute(input: CreateServiceInputDTO): Promise<Result<ServiceOutputDTO, Error>> {
    try {
      // 1. Compute slug if not provided
      const rawSlug = input.slug?.trim() || slugify(input.name, { lower: true, strict: true });
      const slug =
        (rawSlug || `service-${Date.now().toString(36)}`)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/(^-+|-+$)/g, '') || `service-${Date.now().toString(36)}`;

      // 2. Check slug collision in tenant workspace
      const slugExists = await this.serviceRepo.existsWithSlug(input.workspaceId, slug);
      if (slugExists) {
        return Result.fail(
          new ConflictError(`A service with the slug '${slug}' already exists in this workspace.`)
        );
      }

      // 3. Construct domain entity (enforces business rules)
      const service = Service.create({
        workspaceId: input.workspaceId,
        categoryId: input.categoryId,
        name: input.name,
        slug,
        description: input.description,
        durationMinutes: input.durationMinutes,
        bufferBeforeMinutes: input.bufferBeforeMinutes,
        bufferAfterMinutes: input.bufferAfterMinutes,
        price: input.price,
        currency: input.currency,
        locationType: input.locationType,
        locationDetails: input.locationDetails,
        isActive: input.isActive,
        hasYieldPricing: input.hasYieldPricing,
        yieldDiscountPercent: input.yieldDiscountPercent,
        yieldDays: input.yieldDays,
        yieldStartTime: input.yieldStartTime,
        yieldEndTime: input.yieldEndTime,
        yieldLabel: input.yieldLabel,
        intakeQuestions: input.intakeQuestions,
        addons: input.addons,
        routingStrategy: input.routingStrategy,
      });

      // 4. Persist
      await this.serviceRepo.save(service);

      // 5. Map to Output DTO
      const output: ServiceOutputDTO = {
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
        createdAt: service.createdAt.toISOString(),
        updatedAt: service.updatedAt.toISOString(),
      };

      return Result.ok(output);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
