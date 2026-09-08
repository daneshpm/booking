/**
 * Minimal stand-ins for next/headers, which needs a live request context.
 *
 * Tests drive the server actions directly, so the values here are whatever the
 * test sets. Keeping them mutable lets a test vary the caller address for the
 * rate limiter, or supply a session cookie.
 */

const requestHeaders = new Map<string, string>();
const requestCookies = new Map<string, string>();

export function __setHeader(name: string, value: string): void {
  requestHeaders.set(name.toLowerCase(), value);
}

export function __setCookie(name: string, value: string): void {
  requestCookies.set(name, value);
}

export function __resetRequestContext(): void {
  requestHeaders.clear();
  requestCookies.clear();
}

export async function headers() {
  return {
    get: (name: string) => requestHeaders.get(name.toLowerCase()) ?? null,
  };
}

export async function cookies() {
  return {
    get: (name: string) => {
      const value = requestCookies.get(name);
      return value === undefined ? undefined : { name, value };
    },
    set: (name: string, value: string) => {
      requestCookies.set(name, value);
    },
    delete: (name: string) => {
      requestCookies.delete(name);
    },
  };
}
