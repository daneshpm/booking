import type { Service as PrismaService } from '@bookings/database';
import { Service } from '../../domain/entities/Service';
import type { LocationType } from '@bookings/core';

export class ServiceMapper {
  public static toDomain(raw: PrismaService): Service {
    return Service.create({
      id: raw.id,
      workspaceId: raw.workspaceId,
      categoryId: raw.categoryId,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      durationMinutes: raw.durationMinutes,
      bufferBeforeMinutes: raw.bufferBeforeMinutes,
      bufferAfterMinutes: raw.bufferAfterMinutes,
      price: Number(raw.price),
      currency: raw.currency,
      locationType: raw.locationType as LocationType,
      locationDetails: raw.locationDetails,
      isActive: raw.isActive,
      hasYieldPricing: raw.hasYieldPricing ?? false,
      yieldDiscountPercent: raw.yieldDiscountPercent,
      yieldDays: raw.yieldDays,
      yieldStartTime: raw.yieldStartTime,
      yieldEndTime: raw.yieldEndTime,
      yieldLabel: raw.yieldLabel,
      intakeQuestions: raw.intakeQuestions as any[] | null,
      addons: raw.addons as any[] | null,
      routingStrategy: raw.routingStrategy ?? 'ANY_AVAILABLE',
      capacity: raw.capacity,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(service: Service) {
    return {
      id: service.id,
      workspaceId: service.workspaceId,
      categoryId: service.categoryId,
      name: service.name,
      slug: service.slug,
      description: service.description,
      durationMinutes: service.duration.minutes,
      bufferBeforeMinutes: service.buffer.beforeMinutes,
      bufferAfterMinutes: service.buffer.afterMinutes,
      price: service.pricing.amount,
      currency: service.pricing.currency,
      locationType: service.locationType,
      locationDetails: service.locationDetails,
      isActive: service.isActive,
      hasYieldPricing: service.hasYieldPricing,
      yieldDiscountPercent: service.yieldDiscountPercent,
      yieldDays: service.yieldDays,
      yieldStartTime: service.yieldStartTime,
      yieldEndTime: service.yieldEndTime,
      yieldLabel: service.yieldLabel,
      intakeQuestions: (service.intakeQuestions ?? null) as any,
      addons: (service.addons ?? null) as any,
      routingStrategy: service.routingStrategy,
      capacity: service.capacity,
    };
  }
}
