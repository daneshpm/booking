import { Result, NotFoundError } from '@zoho-bookings/core';
import type { IServiceRepository } from '../../domain/repositories/IServiceRepository';

export class DeleteServiceUseCase {
  constructor(private readonly serviceRepo: IServiceRepository) {}

  public async execute(params: { workspaceId: string; id: string }): Promise<Result<void, Error>> {
    try {
      const existing = await this.serviceRepo.findById(params.workspaceId, params.id);
      if (!existing) {
        return Result.fail(new NotFoundError('Service', params.id));
      }

      await this.serviceRepo.delete(params.workspaceId, params.id);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
