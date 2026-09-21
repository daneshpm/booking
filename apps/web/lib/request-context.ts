import { headers } from 'next/headers';
import { childLogger, type LogFields } from '@bookings/core';

/**
 * The header middleware sets, and that nginx may set ahead of it. Lower case
 * because that is how both Next and nginx normalise it.
 */
export const REQUEST_ID_HEADER = 'x-request-id';

/** A request id that is not a real one, so a log line never silently lies. */
export const UNKNOWN_REQUEST_ID = 'unknown';

/**
 * The current request's id, as set by middleware.
 *
 * Returns `unknown` rather than inventing one: a fresh id per call would look
 * like correlation while correlating nothing, which is worse than admitting
 * the id is missing.
 */
export async function requestId(): Promise<string> {
  try {
    const headerList = await headers();
    return headerList.get(REQUEST_ID_HEADER) || UNKNOWN_REQUEST_ID;
  } catch {
    // headers() throws outside a request scope — a background job, say.
    return UNKNOWN_REQUEST_ID;
  }
}

/** A logger bound to this request, so every line it writes can be joined up. */
export async function requestLogger(base: LogFields = {}): Promise<ReturnType<typeof childLogger>> {
  return childLogger({ requestId: await requestId(), ...base });
}
