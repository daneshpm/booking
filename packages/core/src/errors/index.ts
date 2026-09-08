/**
 * Base Application Error
 */
export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when domain business rule validation fails (e.g. invalid duration or negative price)
 */
export class DomainError extends AppError {
  public readonly statusCode = 422;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'DOMAIN_RULE_VIOLATION', details);
  }
}

/**
 * Thrown when input payload schema validation fails
 */
export class ValidationError extends AppError {
  public readonly statusCode = 400;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', details);
  }
}

/**
 * Thrown when a requested resource is not found
 */
export class NotFoundError extends AppError {
  public readonly statusCode = 404;
  constructor(resource: string, id?: string) {
    const msg = id
      ? `${resource} with identifier '${id}' was not found.`
      : `${resource} was not found.`;
    super(msg, 'RESOURCE_NOT_FOUND', { resource, id });
  }
}

/**
 * Thrown when a conflict occurs (e.g. duplicate slug, slot double-booking collision)
 */
export class ConflictError extends AppError {
  public readonly statusCode = 409;
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 'CONFLICT_ERROR', details);
  }
}

/**
 * Thrown when authentication is missing or invalid
 */
export class UnauthorizedError extends AppError {
  public readonly statusCode = 401;
  constructor(message = 'Authentication required to access this resource.') {
    super(message, 'UNAUTHORIZED');
  }
}

/**
 * Thrown when authenticated user lacks permissions (RBAC)
 */
export class ForbiddenError extends AppError {
  public readonly statusCode = 403;
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'FORBIDDEN');
  }
}

/**
 * Thrown when a booking slot is no longer available at reservation time
 */
export class SlotUnavailableError extends AppError {
  public readonly statusCode = 409;
  constructor(message = 'The requested time slot is no longer available.') {
    super(message, 'SLOT_UNAVAILABLE');
  }
}
