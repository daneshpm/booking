/** Outcome of a single delivery attempt on any channel. */
export interface DeliveryResult {
  delivered: boolean;
  /** Reason for failure, recorded against the notification log. */
  error?: string;
  /** Provider-side identifier, when the provider returns one. */
  providerId?: string;
}

/** Reasons a channel reports itself unusable, kept consistent across channels. */
export function notConfigured(what: string): DeliveryResult {
  return { delivered: false, error: `${what} is not configured for this deployment` };
}

/**
 * Trim a provider error to something worth storing.
 *
 * Provider responses can be long and occasionally echo the payload back, which
 * would put customer details into the log table.
 */
export function describeError(err: unknown, fallback = 'Unknown delivery error'): string {
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!message) return fallback;
  return message.length > 300 ? `${message.slice(0, 297)}...` : message;
}
