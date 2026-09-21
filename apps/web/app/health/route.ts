import { NextResponse } from 'next/server';
import { prisma } from '@bookings/database';
import { logger } from '@bookings/core';
import { REQUEST_ID_HEADER } from '@/lib/request-context';

/**
 * Liveness and readiness.
 *
 * `GET /health` answers as soon as the process can serve a request, which is
 * what a load balancer needs to know before sending traffic. `GET /health?
 * ready=1` additionally checks the database, which is what a deploy needs to
 * know before cutting over.
 *
 * The two are deliberately one route with a flag rather than two: a liveness
 * probe that touches the database will restart a healthy container during a
 * database blip, turning a brief outage into a crash loop.
 *
 * The body carries no version, environment, dependency host or error detail.
 * This endpoint is unauthenticated and reachable from the internet, so
 * anything it reports is public.
 */

/** Never statically generated: the answer is about right now. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Sent explicitly rather than left to the framework.
 *
 * `force-dynamic` stops Next from prerendering this, but it emits no cache
 * header, so any proxy or CDN in front is free to apply its own default and
 * serve a cached "ok" for a process that has since died.
 */
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

export async function GET(request: Request): Promise<NextResponse> {
  const wantsReadiness = new URL(request.url).searchParams.has('ready');

  if (!wantsReadiness) {
    return NextResponse.json({ status: 'ok' }, { status: 200, headers: NO_STORE });
  }

  try {
    // The cheapest round trip that proves the connection pool works and the
    // credentials are still valid.
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ready' }, { status: 200, headers: NO_STORE });
  } catch (err) {
    // Logged in full for the operator, reported as a bare status to the
    // caller: the message would otherwise name the host, role and database.
    logger.error('Readiness check failed', {
      requestId: request.headers.get(REQUEST_ID_HEADER) ?? undefined,
      err,
    });
    return NextResponse.json({ status: 'unavailable' }, { status: 503, headers: NO_STORE });
  }
}
