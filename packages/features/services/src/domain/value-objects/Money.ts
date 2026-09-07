import { DomainError } from '@bookings/core';

export class Money {
  private readonly _amount: number;
  private readonly _currency: string;

  private constructor(amount: number, currency: string) {
    this._amount = amount;
    this._currency = currency.toUpperCase();
  }

  public get amount(): number {
    return this._amount;
  }

  public get currency(): string {
    return this._currency;
  }

  public static create(amount: number, currency = 'USD'): Money {
    if (isNaN(amount) || amount < 0) {
      throw new DomainError('Price amount must be a non-negative number.', { amount });
    }
    if (!currency || currency.trim().length !== 3) {
      throw new DomainError('Currency must be a 3-letter ISO code (e.g. USD, EUR, GBP).', { currency });
    }
    return new Money(Number(amount.toFixed(2)), currency);
  }

  public format(): string {
    if (this._amount === 0) return 'Free';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this._currency,
    }).format(this._amount);
  }
}
