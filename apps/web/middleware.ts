import { NextResponse, type NextRequest } from 'next/server';

/**
 * Name of the session cookie. Duplicated from @bookings/auth rather than
 * imported because middleware runs on the Edge runtime, which cannot load the
 * Prisma-backed auth package.
 */
const SESSION_COOKIE = 'rb_session';

/** Routes that require a signed-in user. */
const PROTECTED_PREFIXES = [
  '/appointments',
  '/availability',
  '/booking-pages',
  '/calendar',
  '/customers',
  '/event-types',
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

  if (isProtected(pathname) && !hasSessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (AUTH_ROUTES.includes(pathname) && hasSessionCookie) {
    return NextResponse.redirect(new URL('/appointments', request.url));
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Run on everything except Next internals, the public booking flow, and
   * static assets. Public booking pages stay reachable without a session.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|book|api|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)'],
};
