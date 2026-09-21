import { test, expect } from '@playwright/test';
import { E2E } from './fixtures';

/**
 * Route protection and sign-in, through a real browser.
 *
 * The middleware that guards the dashboard runs at the edge, before any
 * server action: no unit or integration test in this repository executes it.
 * Typing a dashboard URL while signed out is also the most obvious thing an
 * attacker tries, and the cheapest thing for a refactor to break.
 */

/** Every folder under app/(dashboard) that renders a real page. */
const PROTECTED_ROUTES = [
  '/appointments',
  '/calendar',
  '/customers',
  '/services',
  '/staff',
  '/availability',
  '/analytics',
  '/settings',
  '/workflows',
  '/export',
  '/booking-pages',
  '/event-types',
  '/schedules',
  '/users',
];

test.describe('dashboard route protection', () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} is not reachable while signed out`, async ({ page }) => {
      await page.goto(route);

      // Landing on the login page is the pass condition; rendering any of the
      // dashboard would mean the guard was bypassed by typing a URL.
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('input[name="email"]')).toBeVisible();
    });
  }
});

test.describe('signing in', () => {
  test('rejects a wrong password and stays signed out', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', E2E.email);
    await page.fill('input[name="password"]', 'ThisIsNotThePassword123');
    await page.click('button[type="submit"]');

    // Still on login, and the dashboard is still out of reach.
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/appointments');
    await expect(page).toHaveURL(/\/login/);
  });

  test('rejects an unknown address without revealing that it is unknown', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', 'nobody-at-all@example.com');
    await page.fill('input[name="password"]', 'AnyPassword123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/login/);

    // Whatever is shown must not distinguish "no such account" from "wrong
    // password", or the login form becomes the enumeration oracle that the
    // password-reset flow goes to some length to avoid being.
    const body = ((await page.locator('body').textContent()) ?? '').toLowerCase();
    expect(body).not.toContain('no account');
    expect(body).not.toContain('not found');
    expect(body).not.toContain('does not exist');
  });

  test('signs a real owner in and opens the dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[name="email"]', E2E.email);
    await page.fill('input[name="password"]', E2E.password);
    await page.click('button[type="submit"]');

    // Login lands on the dashboard; /dashboard itself redirects to
    // /appointments, so either is a success.
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });
    await expect(page).not.toHaveURL(/\/login/);

    // And the session genuinely holds across a fresh navigation, rather than
    // the redirect merely having happened once.
    await page.goto('/appointments');
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('signing out puts the dashboard back out of reach', async ({ page, context }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', E2E.email);
    await page.fill('input[name="password"]', E2E.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });

    // Dropping the cookie stands in for the sign-out control, whose markup
    // varies: what matters is that the server does not keep serving the
    // dashboard to a request without a valid session.
    await context.clearCookies();

    await page.goto('/appointments');
    await expect(page).toHaveURL(/\/login/);
  });
});
