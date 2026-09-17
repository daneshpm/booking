import type { LocationType } from '@bookings/core';

export interface CreateServiceInputDTO {
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
  intakeQuestions?: any[] | null;
  addons?: any[] | null;
  routingStrategy?: string | null;
  capacity?: number | null;
}

export interface ServiceOutputDTO {
  id: string;
  workspaceId: string;
  categoryId: string | null;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  formattedDuration: string;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  price: number;
  currency: string;
  formattedPrice: string;
  locationType: LocationType;
  locationDetails: string | null;
  isActive: boolean;
  hasYieldPricing?: boolean;
  yieldDiscountPercent?: number | null;
  yieldDays?: string | null;
  yieldStartTime?: string | null;
  yieldEndTime?: string | null;
  yieldLabel?: string | null;
  intakeQuestions?: any[] | null;
  addons?: any[] | null;
  routingStrategy?: string | null;
  capacity?: number | null;
  createdAt: string;
  updatedAt: string;
}
