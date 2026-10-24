/**
 * Generic domain event and pub/sub event bus interfaces for decoupled feature communication.
 */

export interface DomainEvent<TPayload = unknown> {
  /** Unique name or topic of the event (e.g., 'booking.created', 'staff.invited') */
  name: string;
  /** ISO timestamp when the event occurred */
  occurredAt: string;
  /** Workspace or tenant ID to which this event belongs */
  workspaceId: string;
  /** Strongly typed event payload */
  payload: TPayload;
}

export type EventHandler<TEvent extends DomainEvent = DomainEvent> = (
  event: TEvent
) => Promise<void> | void;

export interface IEventBus {
  /**
   * Subscribe an event handler to a specific event name or wildcard pattern.
   * Returns an unsubscribe function.
   */
  subscribe<TEvent extends DomainEvent = DomainEvent>(
    eventName: string,
    handler: EventHandler<TEvent>
  ): () => void;

  /**
   * Publish a domain event to all registered listeners.
   * Isolates listener errors so one failing handler does not disrupt others.
   */
  publish<TEvent extends DomainEvent = DomainEvent>(event: TEvent): Promise<void>;
}

export class InMemoryEventBus implements IEventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  subscribe<TEvent extends DomainEvent = DomainEvent>(
    eventName: string,
    handler: EventHandler<TEvent>
  ): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    const set = this.handlers.get(eventName)!;
    set.add(handler);

    return () => {
      set.delete(handler);
      if (set.size === 0) {
        this.handlers.delete(eventName);
      }
    };
  }

  async publish<TEvent extends DomainEvent = DomainEvent>(event: TEvent): Promise<void> {
    const specificHandlers = this.handlers.get(event.name) || new Set();
    const wildcardHandlers = this.handlers.get('*') || new Set();

    const allHandlers = [...specificHandlers, ...wildcardHandlers];
    if (allHandlers.length === 0) {
      return;
    }

    const executions = allHandlers.map(async (handler) => {
      try {
        await handler(event);
      } catch (err) {
        console.error(`[EventBus] Error executing handler for event "${event.name}":`, err);
      }
    });

    await Promise.allSettled(executions);
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Global default singleton event bus for shared in-process messaging */
export const defaultEventBus = new InMemoryEventBus();

// --- Standard Booking Domain Events ---

export interface BookingCreatedPayload {
  bookingId: string;
  serviceId: string;
  serviceName: string;
  staffId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  startTime: string;
  endTime: string;
  status: string;
}

export interface BookingCancelledPayload {
  bookingId: string;
  reason?: string | null;
  cancelledBy: 'CUSTOMER' | 'STAFF' | 'SYSTEM';
}

export interface BookingRescheduledPayload {
  bookingId: string;
  previousStartTime: string;
  previousEndTime: string;
  newStartTime: string;
  newEndTime: string;
}

export class BookingCreatedEvent implements DomainEvent<BookingCreatedPayload> {
  readonly name = 'booking.created';
  readonly occurredAt: string;

  constructor(
    public readonly workspaceId: string,
    public readonly payload: BookingCreatedPayload
  ) {
    this.occurredAt = new Date().toISOString();
  }
}

export class BookingCancelledEvent implements DomainEvent<BookingCancelledPayload> {
  readonly name = 'booking.cancelled';
  readonly occurredAt: string;

  constructor(
    public readonly workspaceId: string,
    public readonly payload: BookingCancelledPayload
  ) {
    this.occurredAt = new Date().toISOString();
  }
}

export class BookingRescheduledEvent implements DomainEvent<BookingRescheduledPayload> {
  readonly name = 'booking.rescheduled';
  readonly occurredAt: string;

  constructor(
    public readonly workspaceId: string,
    public readonly payload: BookingRescheduledPayload
  ) {
    this.occurredAt = new Date().toISOString();
  }
}
