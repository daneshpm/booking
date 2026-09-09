import type { LocationType } from '@bookings/core';
import type { ServiceOutputDTO } from '../create-service/CreateServiceDTO';

export interface UpdateServiceInputDTO {
  id: string;
  workspaceId: string;
  name: string;
  slug?: string | null;
  description?: string | null;
  categoryId?: string | null;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  price?: number;
  currency?: string;
  locationType?: LocationType;
  locationDetails?: string | null;
  isActive?: boolean;
  hasYieldPricing?: boolean;
  yieldDiscountPercent?: number | null;
  yieldDays?: string | null;
  yieldStartTime?: string | null;
  yieldEndTime?: string | null;
  yieldLabel?: string | null;
}
