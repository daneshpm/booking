import type { LocationType } from '@zoho-bookings/core';
import type { ServiceOutputDTO } from '../create-service/CreateServiceDTO';

export interface UpdateServiceInputDTO {
  id: string;
  workspaceId: string;
  name: string;
  slug?: string;
  description?: string;
  categoryId?: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  price?: number;
  currency?: string;
  locationType?: LocationType;
  locationDetails?: string;
  isActive?: boolean;
}
