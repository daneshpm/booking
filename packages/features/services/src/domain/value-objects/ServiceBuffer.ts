import { DomainError } from '@bookings/core';

export class ServiceBuffer {
  private readonly _beforeMinutes: number;
  private readonly _afterMinutes: number;

  private constructor(beforeMinutes: number, afterMinutes: number) {
    this._beforeMinutes = beforeMinutes;
    this._afterMinutes = afterMinutes;
  }

  public get beforeMinutes(): number {
    return this._beforeMinutes;
  }

  public get afterMinutes(): number {
    return this._afterMinutes;
  }

  public get totalBufferMinutes(): number {
    return this._beforeMinutes + this._afterMinutes;
  }

  public static create(beforeMinutes = 0, afterMinutes = 0): ServiceBuffer {
    if (!Number.isInteger(beforeMinutes) || beforeMinutes < 0) {
      throw new DomainError('Buffer before must be a non-negative integer in minutes.', { beforeMinutes });
    }
    if (!Number.isInteger(afterMinutes) || afterMinutes < 0) {
      throw new DomainError('Buffer after must be a non-negative integer in minutes.', { afterMinutes });
    }
    if (beforeMinutes > 180 || afterMinutes > 180) {
      throw new DomainError('Individual buffer time cannot exceed 180 minutes (3 hours).', { beforeMinutes, afterMinutes });
    }
    return new ServiceBuffer(beforeMinutes, afterMinutes);
  }
}
