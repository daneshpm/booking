import { NextResponse, type NextRequest } from 'next/server';
import { isSafeRequestId } from '@bookings/core';

/**
 * Name of the session cookie. Duplicated from @bookings/auth rather than
 * imported because middleware runs on the Edge runtime, which cannot load the
 * Prisma-backed auth package.
 */
const SESSION_COOKIE = 'rb_session';

/**
 * Correlation id header. Duplicated from lib/request-context for the same
 * reason as the cookie name: that module imports `next/headers`, which the
 * Edge runtime cannot load.
 */
const REQUEST_ID_HEADER = 'x-request-id';

/** Routes that require a signed-in user. */
const PROTECTED_PREFIXES = [
  '/analytics',
  '/appointments',
  '/availability',
  '/booking-pages',
  '/calendar',
  '/customers',
  '/event-types',
  '/export',
  '/schedules',
  '/services',
  '/settings',
  '/staff',
  '/users',
  '/workflows',
];

/** Routes that a signed-in user has no reason to see. */
const AUTH_ROUTES = ['/login', '/signup'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * Coarse edge gate. It only checks whether a session cookie is present, because
 * verifying it needs a database round trip that the Edge runtime cannot make.
 *
 * This is a redirect optimisation, not the security boundary. Every page and
 * server action independently verifies the session through requireSession or
 * requireWorkspace, so a forged cookie gets past this check and then fails at
 * the data layer.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  // Reuse the id if something upstream already assigned one, so a single
  // request keeps one id across nginx and the application rather than
  // acquiring a second one here -- but only when it is plausibly an id.
  // The header is attacker-controlled and ends up both echoed in the
  // response and stamped on every log line this request writes, so an
  // oversized or arbitrary value is a cheap way to inflate the logs.
  const upstreamId = request.headers.get(REQUEST_ID_HEADER);
  const requestId = isSafeRequestId(upstreamId) ? upstreamId : crypto.randomUUID();

  if (isProtected(pathname) && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    const redirect = NextResponse.redirect(loginUrl);
    redirect.headers.set(REQUEST_ID_HEADER, requestId);
    return redirect;
  }

  if (AUTH_ROUTES.includes(pathname) && hasSessionCookie) {
    const redirect = NextResponse.redirect(new URL('/appointments', request.url));
    redirect.headers.set(REQUEST_ID_HEADER, requestId);
    return redirect;
  }

  // Forwarded on the request so server components and server actions can read
  // it, and echoed on the response so a report of "my booking failed" can be
  // tied to the exact lines the failure wrote.
  const forwarded = new Headers(request.headers);
  forwarded.set(REQUEST_ID_HEADER, requestId);

  const response = NextResponse.next({ request: { headers: forwarded } });
  response.headers.set(REQUEST_ID_HEADER, requestId);
  return response;
}

export const config = {
  /*
   * Run on every application route, excluding only Next internals, static
   * assets and `api/`.
   *
   * The public routes — the booking flow, health, reset-password — were once
   * excluded here as well. They are not gated by this middleware (nothing
   * outside PROTECTED_PREFIXES ever redirects), so excluding them bought no
   * protection; it only meant the most exposed code in the product was the
   * one part with no request id to trace a failure by. They now pass through
   * and are assigned one.
   */
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)',
  ],
};
