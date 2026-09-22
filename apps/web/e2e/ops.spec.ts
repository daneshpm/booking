import { test, expect } from '@playwright/test';
import { E2E } from './fixtures';

/**
 * Operational endpoints and response headers.
 *
 * A health check that needs a session is not a health check, and a probe
 * that reports the database's state will restart a healthy container during
 * a database blip. Both are easy to get wrong in a way nothing else notices
 * until an outage.
 */

test.describe('health endpoint', () => {
  test('liveness answers without a session', async ({ request }) => {
    const response = await request.get('/health');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  test('liveness does not redirect to login', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/health');

    // The middleware matcher must exclude it, or a probe gets a 200 for the
    // login page and reports a broken application as healthy.
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('readiness reports the database is reachable', async ({ request }) => {
    const response = await request.get('/health?ready=1');

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: 'ready' });
  });

  test('reveals no version, environment or dependency detail', async ({ request }) => {
    // Unauthenticated and internet-reachable, so everything it returns is
    // public. Version and host detail are free reconnaissance.
    const body = JSON.stringify(await (await request.get('/health?ready=1')).json());

    for (const leak of ['version', 'env', 'postgres', 'redis', 'host', 'password', 'prisma']) {
      expect(body.toLowerCase()).not.toContain(leak);
    }
  });

  test('is not cached', async ({ request }) => {
    const response = await request.get('/health');
    const cacheControl = response.headers()['cache-control'] ?? '';

    // A cached health check reports the state of the past.
    expect(cacheControl).toMatch(/no-store|no-cache|max-age=0/);
  });
});

test.describe('security response headers', () => {
  test('sets the headers a production deployment needs', async ({ request }) => {
    const headers = (await request.get('/login')).headers();

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBeTruthy();
    expect(headers['referrer-policy']).toBeTruthy();
    expect(headers['content-security-policy']).toBeTruthy();
  });

  test('does not advertise the framework it runs on', async ({ request }) => {
    const headers = (await request.get('/login')).headers();

    expect(headers['x-powered-by']).toBeUndefined();
  });
});

test.describe('request correlation', () => {
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  test('assigns an id to a dashboard request', async ({ request }) => {
    const headers = (await request.get('/login')).headers();

    expect(headers['x-request-id']).toMatch(UUID);
  });

  test('assigns an id on the public booking flow too', async ({ request }) => {
    // This path used to be excluded from middleware, which meant the most
    // exposed code in the product was the part with no id to trace by.
    const headers = (await request.get(`/book/${E2E.workspaceSlug}`)).headers();

    expect(headers['x-request-id']).toMatch(UUID);
  });

  test('gives different requests different ids', async ({ request }) => {
    const first = (await request.get('/login')).headers()['x-request-id'];
    const second = (await request.get('/login')).headers()['x-request-id'];

    expect(first).not.toBe(second);
  });

  test('keeps an id assigned upstream rather than issuing a second one', async ({ request }) => {
    // nginx may assign the id first. Overwriting it would split one request
    // across two ids and break correlation at the proxy boundary.
    const upstream = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    const headers = (
      await request.get('/login', { headers: { 'x-request-id': upstream } })
    ).headers();

    expect(headers['x-request-id']).toBe(upstream);
  });

  test('replaces an oversized upstream id instead of echoing it', async ({ request }) => {
    // Unvalidated, this value is echoed to the caller and stamped onto every
    // log line the request writes: a cheap way to inflate logs on a box whose
    // disk is shared with the database. Production accepted 3000 characters
    // verbatim before this was fixed.
    const oversized = 'A'.repeat(3000);
    const headers = (
      await request.get('/health', { headers: { 'x-request-id': oversized } })
    ).headers();

    expect(headers['x-request-id']).not.toBe(oversized);
    expect(headers['x-request-id']).toMatch(UUID);
  });

  test('replaces an upstream id containing characters an id should not have', async ({
    request,
  }) => {
    for (const hostile of ['abc def', 'abc<script>', 'a;b', 'a,b']) {
      const headers = (
        await request.get('/health', { headers: { 'x-request-id': hostile } })
      ).headers();

      expect(headers['x-request-id'], hostile).not.toBe(hostile);
      expect(headers['x-request-id'], hostile).toMatch(UUID);
    }
  });

  test('redirects carry an id as well', async ({ request }) => {
    // A redirect to /login is exactly the response worth tracing when someone
    // reports being logged out unexpectedly.
    const response = await request.get('/appointments', { maxRedirects: 0 });

    expect(response.status()).toBe(307);
    expect(response.headers()['x-request-id']).toMatch(UUID);
  });
});
