/**
 * Validation for a correlation id arriving from upstream.
 *
 * The id is taken from a request header, so it is attacker-controlled. It is
 * then echoed in the response and stamped into every log line the request
 * produces, which makes an unvalidated value two problems at once:
 *
 *  - **Log amplification.** A 3 KB header becomes 3 KB on every line that
 *    request writes. Unauthenticated, repeatable, and aimed at a disk that is
 *    also the database's.
 *  - **Unparseable logs.** A field that is a UUID everywhere else suddenly
 *    holding arbitrary text breaks whatever greps it.
 *
 * Reusing a valid upstream id is still the right behaviour — it is what keeps
 * nginx and the application on one id per request. Only implausible ones are
 * replaced.
 */

/** Long enough for any real tracing scheme, short enough to be harmless. */
export const MAX_REQUEST_ID_LENGTH = 128;

/**
 * Characters used by the tracing formats worth interoperating with: UUIDs,
 * W3C trace-context, nginx's `$request_id`, and hyphen/underscore-separated
 * ids. Deliberately excludes whitespace and control characters, so a value
 * that survives this cannot break a line in a log or a header.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]+$/;

export function isSafeRequestId(value: string | null | undefined): value is string {
  if (!value) return false;
  if (value.length > MAX_REQUEST_ID_LENGTH) return false;
  return SAFE_REQUEST_ID.test(value);
}
