import type { LocationType } from '@zoho-bookings/core';

export interface CreateServiceInputDTO {
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
  createdAt: string;
  updatedAt: string;
}
