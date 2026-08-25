import { prisma } from '@zoho-bookings/database';
import type { IServiceRepository } from '../../domain/repositories/IServiceRepository';
import type { Service } from '../../domain/entities/Service';
import { ServiceMapper } from '../mappers/ServiceMapper';

export class PrismaServiceRepository implements IServiceRepository {
  public async findById(workspaceId: string, id: string): Promise<Service | null> {
    const raw = await prisma.service.findFirst({
      where: {
        id,
        workspaceId,
      },
    });

    if (!raw) return null;
    return ServiceMapper.toDomain(raw);
  }

  public async findBySlug(workspaceId: string, slug: string): Promise<Service | null> {
    const raw = await prisma.service.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId,
          slug,
        },
      },
    });

    if (!raw) return null;
    return ServiceMapper.toDomain(raw);
  }

  public async findAllByWorkspace(
    workspaceId: string,
    options?: { categoryId?: string; isActive?: boolean }
  ): Promise<Service[]> {
    const records = await prisma.service.findMany({
      where: {
        workspaceId,
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.isActive !== undefined ? { isActive: options.isActive } : {}),
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return records.map(ServiceMapper.toDomain);
  }

  public async save(service: Service): Promise<void> {
    const data = ServiceMapper.toPersistence(service);

    await prisma.service.upsert({
      where: {
        id: service.id,
      },
      create: data,
      update: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        categoryId: data.categoryId,
        durationMinutes: data.durationMinutes,
        bufferBeforeMinutes: data.bufferBeforeMinutes,
        bufferAfterMinutes: data.bufferAfterMinutes,
        price: data.price,
        currency: data.currency,
        locationType: data.locationType,
        locationDetails: data.locationDetails,
        isActive: data.isActive,
      },
    });
  }

  public async delete(workspaceId: string, id: string): Promise<void> {
    await prisma.service.delete({
      where: {
        id,
        workspaceId,
      },
    });
  }

  public async existsWithSlug(
    workspaceId: string,
    slug: string,
    excludeId?: string
  ): Promise<boolean> {
    const count = await prisma.service.count({
      where: {
        workspaceId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    return count > 0;
  }
}
