import { DomainError, type LocationType } from '@bookings/core';
import { ServiceDuration } from '../value-objects/ServiceDuration';
import { ServiceBuffer } from '../value-objects/ServiceBuffer';
import { Money } from '../value-objects/Money';

export interface ServiceProps {
  id: string;
  workspaceId: string;
  categoryId?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  duration: ServiceDuration;
  buffer: ServiceBuffer;
  pricing: Money;
  locationType: LocationType;
  locationDetails?: string | null;
  isActive: boolean;
  hasYieldPricing?: boolean;
  yieldDiscountPercent?: number | null;
  yieldDays?: string | null;
  yieldStartTime?: string | null;
  yieldEndTime?: string | null;
  yieldLabel?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class Service {
  private readonly _id: string;
  private readonly _workspaceId: string;
  private _categoryId: string | null;
  private _name: string;
  private _slug: string;
  private _description: string | null;
  private _duration: ServiceDuration;
  private _buffer: ServiceBuffer;
  private _pricing: Money;
  private _locationType: LocationType;
  private _locationDetails: string | null;
  private _isActive: boolean;
  private _hasYieldPricing: boolean;
  private _yieldDiscountPercent: number | null;
  private _yieldDays: string | null;
  private _yieldStartTime: string | null;
  private _yieldEndTime: string | null;
  private _yieldLabel: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: ServiceProps) {
    this._id = props.id;
    this._workspaceId = props.workspaceId;
    this._categoryId = props.categoryId ?? null;
    this._name = props.name;
    this._slug = props.slug;
    this._description = props.description ?? null;
    this._duration = props.duration;
    this._buffer = props.buffer;
    this._pricing = props.pricing;
    this._locationType = props.locationType;
    this._locationDetails = props.locationDetails ?? null;
    this._isActive = props.isActive;
    this._hasYieldPricing = props.hasYieldPricing ?? false;
    this._yieldDiscountPercent = props.yieldDiscountPercent ?? null;
    this._yieldDays = props.yieldDays ?? null;
    this._yieldStartTime = props.yieldStartTime ?? null;
    this._yieldEndTime = props.yieldEndTime ?? null;
    this._yieldLabel = props.yieldLabel ?? 'Off-Peak Special';
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  // Getters
  public get id(): string {
    return this._id;
  }
  public get workspaceId(): string {
    return this._workspaceId;
  }
  public get categoryId(): string | null {
    return this._categoryId;
  }
  public get name(): string {
    return this._name;
  }
  public get slug(): string {
    return this._slug;
  }
  public get description(): string | null {
    return this._description;
  }
  public get duration(): ServiceDuration {
    return this._duration;
  }
  public get buffer(): ServiceBuffer {
    return this._buffer;
  }
  public get pricing(): Money {
    return this._pricing;
  }
  public get locationType(): LocationType {
    return this._locationType;
  }
  public get locationDetails(): string | null {
    return this._locationDetails;
  }
  public get isActive(): boolean {
    return this._isActive;
  }
  public get hasYieldPricing(): boolean {
    return this._hasYieldPricing;
  }
  public get yieldDiscountPercent(): number | null {
    return this._yieldDiscountPercent;
  }
  public get yieldDays(): string | null {
    return this._yieldDays;
  }
  public get yieldStartTime(): string | null {
    return this._yieldStartTime;
  }
  public get yieldEndTime(): string | null {
    return this._yieldEndTime;
  }
  public get yieldLabel(): string | null {
    return this._yieldLabel;
  }
  public get createdAt(): Date {
    return this._createdAt;
  }
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // Factory constructor
  public static create(params: {
    id?: string;
    workspaceId: string;
    categoryId?: string | null;
    name: string;
    slug: string;
    description?: string | null;
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
    createdAt?: Date;
    updatedAt?: Date;
  }): Service {
    if (!params.workspaceId || params.workspaceId.trim().length === 0) {
      throw new DomainError('Service must belong to a valid workspace.');
    }
    if (!params.name || params.name.trim().length === 0) {
      throw new DomainError('Service name cannot be empty.');
    }
    if (params.name.trim().length > 100) {
      throw new DomainError('Service name cannot exceed 100 characters.');
    }
    if (!params.slug || !/^[a-z0-9-]+$/.test(params.slug)) {
      throw new DomainError(
        'Service slug must only contain lowercase alphanumeric characters and hyphens.'
      );
    }

    const duration = ServiceDuration.create(params.durationMinutes);
    const buffer = ServiceBuffer.create(
      params.bufferBeforeMinutes ?? 0,
      params.bufferAfterMinutes ?? 0
    );
    const pricing = Money.create(params.price ?? 0, params.currency ?? 'USD');

    return new Service({
      id: params.id ?? crypto.randomUUID(),
      workspaceId: params.workspaceId,
      categoryId: params.categoryId ?? null,
      name: params.name.trim(),
      slug: params.slug.trim(),
      description: params.description?.trim() ?? null,
      duration,
      buffer,
      pricing,
      locationType: params.locationType ?? 'ONLINE_MEETING',
      locationDetails: params.locationDetails?.trim() ?? null,
      isActive: params.isActive ?? true,
      hasYieldPricing: params.hasYieldPricing ?? false,
      yieldDiscountPercent: params.yieldDiscountPercent ?? null,
      yieldDays: params.yieldDays ?? null,
      yieldStartTime: params.yieldStartTime ?? null,
      yieldEndTime: params.yieldEndTime ?? null,
      yieldLabel: params.yieldLabel ?? 'Off-Peak Special',
      createdAt: params.createdAt ?? new Date(),
      updatedAt: params.updatedAt ?? new Date(),
    });
  }

  // Domain Behaviors
  public updateDetails(params: {
    name: string;
    slug: string;
    description?: string | null;
    categoryId?: string | null;
    durationMinutes: number;
    bufferBeforeMinutes?: number;
    bufferAfterMinutes?: number;
    price?: number;
    currency?: string;
    locationType?: LocationType;
    locationDetails?: string | null;
    hasYieldPricing?: boolean;
    yieldDiscountPercent?: number | null;
    yieldDays?: string | null;
    yieldStartTime?: string | null;
    yieldEndTime?: string | null;
    yieldLabel?: string | null;
  }): void {
    if (!params.name || params.name.trim().length === 0) {
      throw new DomainError('Service name cannot be empty.');
    }
    if (!params.slug || !/^[a-z0-9-]+$/.test(params.slug)) {
      throw new DomainError(
        'Service slug must only contain lowercase alphanumeric characters and hyphens.'
      );
    }

    this._name = params.name.trim();
    this._slug = params.slug.trim();
    this._description = params.description?.trim() ?? null;
    this._categoryId = params.categoryId ?? null;
    this._duration = ServiceDuration.create(params.durationMinutes);
    this._buffer = ServiceBuffer.create(
      params.bufferBeforeMinutes ?? 0,
      params.bufferAfterMinutes ?? 0
    );
    this._pricing = Money.create(params.price ?? 0, params.currency ?? this._pricing.currency);
    if (params.locationType) this._locationType = params.locationType;
    this._locationDetails = params.locationDetails?.trim() ?? null;
    if (params.hasYieldPricing !== undefined) this._hasYieldPricing = params.hasYieldPricing;
    if (params.yieldDiscountPercent !== undefined) this._yieldDiscountPercent = params.yieldDiscountPercent;
    if (params.yieldDays !== undefined) this._yieldDays = params.yieldDays;
    if (params.yieldStartTime !== undefined) this._yieldStartTime = params.yieldStartTime;
    if (params.yieldEndTime !== undefined) this._yieldEndTime = params.yieldEndTime;
    if (params.yieldLabel !== undefined) this._yieldLabel = params.yieldLabel;
    this._updatedAt = new Date();
  }

  public activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  public deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }
}
