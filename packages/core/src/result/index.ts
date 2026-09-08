/**
 * Functional Result Pattern for Clean Architecture Use Cases
 */
export class Result<T, E = Error> {
  public readonly isSuccess: boolean;
  public readonly isFailure: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(isSuccess: boolean, error?: E, value?: T) {
    this.isSuccess = isSuccess;
    this.isFailure = !isSuccess;
    this._value = value;
    this._error = error;
    Object.freeze(this);
  }

  public getValue(): T {
    if (!this.isSuccess) {
      throw new Error(
        'Cannot retrieve value from a failed result. Check isSuccess before calling getValue().'
      );
    }
    return this._value as T;
  }

  public getError(): E {
    if (this.isSuccess) {
      throw new Error(
        'Cannot retrieve error from a successful result. Check isFailure before calling getError().'
      );
    }
    return this._error as E;
  }

  public static ok<U>(value?: U): Result<U, never> {
    return new Result<U, never>(true, undefined, value);
  }

  public static fail<F>(error: F): Result<never, F> {
    return new Result<never, F>(false, error);
  }
}
