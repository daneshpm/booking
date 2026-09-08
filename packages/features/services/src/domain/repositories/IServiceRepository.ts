import { Service } from '../entities/Service';

export interface IServiceRepository {
  findById(workspaceId: string, id: string): Promise<Service | null>;
  findBySlug(workspaceId: string, slug: string): Promise<Service | null>;
  findAllByWorkspace(
    workspaceId: string,
    options?: { categoryId?: string; isActive?: boolean }
  ): Promise<Service[]>;
  save(service: Service): Promise<void>;
  delete(workspaceId: string, id: string): Promise<void>;
  existsWithSlug(workspaceId: string, slug: string, excludeId?: string): Promise<boolean>;
}
