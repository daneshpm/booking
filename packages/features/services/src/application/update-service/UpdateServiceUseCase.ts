import slugify from 'slugify';
import { Result, NotFoundError, ConflictError } from '@bookings/core';
import type { IServiceRepository } from '../../domain/repositories/IServiceRepository';
import type { UpdateServiceInputDTO } from './UpdateServiceDTO';
import type { ServiceOutputDTO } from '../create-service/CreateServiceDTO';

export class UpdateServiceUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  public async execute(input: UpdateServiceInputDTO): Promise<Result<ServiceOutputDTO, Error>> {
    try {
      const service = await this.serviceRepo.findById(input.workspaceId, input.id);
      if (!service) {
        return Result.fail(new NotFoundError('Service', input.id));
      }

      const rawSlug = input.slug?.trim() || slugify(input.name, { lower: true, strict: true });
      const slug =
        (rawSlug || service.slug)
          .toLowerCase()
          .replace(/[^a-z0-9-]+/g, '-')
          .replace(/(^-+|-+$)/g, '') || service.slug;

      // Check slug uniqueness excluding self
      const slugExists = await this.serviceRepo.existsWithSlug(input.workspaceId, slug, input.id);
      if (slugExists) {
        return Result.fail(
          new ConflictError(`A service with the slug '${slug}' already exists in this workspace.`)
        );
      }

      // Update domain entity details
      service.updateDetails({
        name: input.name,
        slug,
        description: input.description,
        categoryId: input.categoryId,
        durationMinutes: input.durationMinutes,
        bufferBeforeMinutes: input.bufferBeforeMinutes,
        bufferAfterMinutes: input.bufferAfterMinutes,
        price: input.price,
        currency: input.currency,
        locationType: input.locationType,
        locationDetails: input.locationDetails,
        hasYieldPricing: input.hasYieldPricing,
        yieldDiscountPercent: input.yieldDiscountPercent,
        yieldDays: input.yieldDays,
        yieldStartTime: input.yieldStartTime,
        yieldEndTime: input.yieldEndTime,
        yieldLabel: input.yieldLabel,
      });

      if (input.isActive !== undefined) {
        if (input.isActive) service.activate();
        else service.deactivate();
      }

      await this.serviceRepo.save(service);

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
        createdAt: service.createdAt.toISOString(),
        updatedAt: service.updatedAt.toISOString(),
      };

      return Result.ok(output);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
