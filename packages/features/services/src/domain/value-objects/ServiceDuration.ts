import { DomainError } from '@zoho-bookings/core';

export class ServiceDuration {
  private readonly _minutes: number;

  private constructor(minutes: number) {
    this._minutes = minutes;
  }

  public get minutes(): number {
    return this._minutes;
  }

  public static create(minutes: number): ServiceDuration {
    if (!Number.isInteger(minutes) || minutes <= 0) {
      throw new DomainError('Service duration must be a positive integer in minutes.', { minutes });
    }
    if (minutes < 5) {
      throw new DomainError('Minimum service duration is 5 minutes.', { minutes });
    }
    if (minutes > 1440) {
      throw new DomainError('Maximum service duration is 24 hours (1440 minutes).', { minutes });
    }
    return new ServiceDuration(minutes);
  }

  public format(): string {
    const hours = Math.floor(this._minutes / 60);
    const mins = this._minutes % 60;
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${hours} hr${hours > 1 ? 's' : ''} ${mins} mins`;
  }
}
