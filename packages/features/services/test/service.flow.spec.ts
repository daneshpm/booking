import { describe, it, expect, beforeEach } from 'vitest';
import { CreateServiceUseCase } from '../src/application/create-service/CreateServiceUseCase';
import { UpdateServiceUseCase } from '../src/application/update-service/UpdateServiceUseCase';
import { GetServicesUseCase } from '../src/application/get-services/GetServicesUseCase';
import { DeleteServiceUseCase } from '../src/application/delete-service/DeleteServiceUseCase';
import { IServiceRepository } from '../src/domain/repositories/IServiceRepository';
import { Service } from '../src/domain/entities/Service';

class InMemoryServiceRepository implements IServiceRepository {
  private services: Map<string, Service> = new Map();

  async findById(workspaceId: string, id: string): Promise<Service | null> {
    const service = this.services.get(id);
    if (!service || service.workspaceId !== workspaceId) return null;
    return service;
  }

  async findBySlug(workspaceId: string, slug: string): Promise<Service | null> {
    for (const service of this.services.values()) {
      if (service.workspaceId === workspaceId && service.slug === slug) {
        return service;
      }
    }
    return null;
  }

  async findAllByWorkspace(
    workspaceId: string,
    options?: { categoryId?: string; isActive?: boolean }
  ): Promise<Service[]> {
    return Array.from(this.services.values()).filter((s) => {
      if (s.workspaceId !== workspaceId) return false;
      if (options?.categoryId && s.categoryId !== options.categoryId) return false;
      if (options?.isActive !== undefined && s.isActive !== options.isActive) return false;
      return true;
    });
  }

  async existsWithSlug(workspaceId: string, slug: string, excludeId?: string): Promise<boolean> {
    for (const service of this.services.values()) {
      if (service.workspaceId === workspaceId && service.slug === slug) {
        if (!excludeId || service.id !== excludeId) {
          return true;
        }
      }
    }
    return false;
  }

  async save(service: Service): Promise<void> {
    this.services.set(service.id, service);
  }

  async delete(workspaceId: string, id: string): Promise<void> {
    const service = this.services.get(id);
    if (service && service.workspaceId === workspaceId) {
      this.services.delete(id);
    }
  }
}

describe('Service Management End-to-End Flow', () => {
  let repo: InMemoryServiceRepository;
  let createUseCase: CreateServiceUseCase;
  let updateUseCase: UpdateServiceUseCase;
  let getServicesUseCase: GetServicesUseCase;
  let deleteUseCase: DeleteServiceUseCase;

  const workspaceId = 'ws-test-workspace';

  beforeEach(() => {
    repo = new InMemoryServiceRepository();
    createUseCase = new CreateServiceUseCase(repo);
    updateUseCase = new UpdateServiceUseCase(repo);
    getServicesUseCase = new GetServicesUseCase(repo);
    deleteUseCase = new DeleteServiceUseCase(repo);
  });

  it('should successfully execute full lifecycle: Create -> List -> Update -> Delete', async () => {
    // 1. Create a One-on-One Service
    const createResult = await createUseCase.execute({
      workspaceId,
      name: 'Executive Coaching 1:1',
      slug: 'executive-coaching',
      description: 'Private 1-on-1 strategy coaching session.',
      durationMinutes: 60,
      bufferBeforeMinutes: 10,
      bufferAfterMinutes: 10,
      price: 150,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      isActive: true,
      hasYieldPricing: true,
      yieldDiscountPercent: 20,
      yieldDays: '1,2,3',
      yieldStartTime: '10:00',
      yieldEndTime: '14:00',
      yieldLabel: 'Early Bird Special',
    });

    expect(createResult.isSuccess).toBe(true);
    const createdService = createResult.getValue();
    expect(createdService.id).toBeDefined();
    expect(createdService.name).toBe('Executive Coaching 1:1');
    expect(createdService.hasYieldPricing).toBe(true);
    expect(createdService.yieldDiscountPercent).toBe(20);

    // 2. Create a Group / Webinar Service
    const groupResult = await createUseCase.execute({
      workspaceId,
      name: 'AI Workshop Masterclass',
      slug: 'ai-workshop-masterclass',
      description: 'Group training webinar on AI workflows.',
      durationMinutes: 90,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      price: 49,
      currency: 'USD',
      locationType: 'ONLINE_MEETING',
      isActive: true,
    });

    expect(groupResult.isSuccess).toBe(true);

    // 3. List all services for the workspace
    const listResult = await getServicesUseCase.execute({ workspaceId });
    expect(listResult.isSuccess).toBe(true);
    const allServices = listResult.getValue();
    expect(allServices).toHaveLength(2);
    expect(allServices.map((s) => s.name)).toContain('Executive Coaching 1:1');
    expect(allServices.map((s) => s.name)).toContain('AI Workshop Masterclass');

    // 4. Update the service
    const updateResult = await updateUseCase.execute({
      workspaceId,
      id: createdService.id,
      name: 'Executive Coaching & Mentorship',
      slug: 'executive-coaching-mentorship',
      durationMinutes: 75,
      bufferBeforeMinutes: 15,
      bufferAfterMinutes: 15,
      price: 180,
    });

    expect(updateResult.isSuccess).toBe(true);
    const updated = updateResult.getValue();
    expect(updated.name).toBe('Executive Coaching & Mentorship');
    expect(updated.price).toBe(180);
    expect(updated.durationMinutes).toBe(75);

    // 5. Delete the service
    const deleteResult = await deleteUseCase.execute({
      workspaceId,
      id: createdService.id,
    });
    expect(deleteResult.isSuccess).toBe(true);

    // Verify it is removed from list
    const finalList = await getServicesUseCase.execute({ workspaceId });
    expect(finalList.getValue()).toHaveLength(1);
    expect(finalList.getValue()[0].name).toBe('AI Workshop Masterclass');
  });

  it('should prevent duplicate service slugs in the same workspace', async () => {
    await createUseCase.execute({
      workspaceId,
      name: 'Product Strategy Review',
      slug: 'product-strategy',
      durationMinutes: 45,
    });

    const duplicateResult = await createUseCase.execute({
      workspaceId,
      name: 'Another Strategy Call',
      slug: 'product-strategy',
      durationMinutes: 30,
    });

    expect(duplicateResult.isFailure).toBe(true);
    expect(duplicateResult.getError().message).toContain('already exists');
  });
});
