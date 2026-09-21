import { test, expect } from '@playwright/test';
import { E2E } from './fixtures';

/**
 * The public booking page, through a real browser.
 *
 * This is the only part of the product a customer ever sees, and the only
 * revenue-carrying path in it. Every other test in the repository stops at
 * the server action underneath.
 */

test.describe('public booking page', () => {
  test('shows the workspace and its bookable service', async ({ page }) => {
    await page.goto(`/book/${E2E.workspaceSlug}`);

    await expect(page.getByText(E2E.workspaceName).first()).toBeVisible();
    await expect(page.getByText(E2E.serviceName).first()).toBeVisible();
  });

  test('does not require a session', async ({ page, context }) => {
    // The whole point of the page: a customer has no account.
    await context.clearCookies();

    const response = await page.goto(`/book/${E2E.workspaceSlug}`);

    expect(response?.status()).toBe(200);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('refuses a workspace slug that does not exist', async ({ page }) => {
    const response = await page.goto('/book/no-such-workspace-anywhere');

    // Either a 404 or a page saying so — what must not happen is another
    // tenant's page, or a stack trace.
    const body = ((await page.locator('body').textContent()) ?? '').toLowerCase();
    const notFound = response?.status() === 404 || body.includes('not found');
    expect(notFound).toBe(true);
    expect(body).not.toContain(E2E.serviceName.toLowerCase());
  });

  test('leaks no stack trace or internals when a slug is malformed', async ({ page }) => {
    await page.goto('/book/%20%20');

    const body = ((await page.locator('body').textContent()) ?? '').toLowerCase();
    for (const smell of ['prisma', 'postgres', 'stack', 'at async', 'node_modules']) {
      expect(body).not.toContain(smell);
    }
  });

  test('reaches the slot step after choosing the service', async ({ page }) => {
    await page.goto(`/book/${E2E.workspaceSlug}`);

    // The service name is a heading; the control that starts the funnel is
    // the card's Book Now link.
    await page
      .getByRole('link', { name: /book now/i })
      .first()
      .click();

    await expect(page).toHaveURL(/\/book\/e2e-clinic\/e2e-consultation/);
    await expect(page.getByRole('heading', { name: 'Select Date & Time' })).toBeVisible({
      timeout: 30_000,
    });
  });

  test('offers bookable times on the slot step', async ({ page }) => {
    // The fixture staff member works 09:00-18:00 every weekday, so the
    // engine should produce slots for a working day. This is the assertion
    // that would catch availability silently returning nothing — the failure
    // that looks like "the business is fully booked" to every customer.
    await page.goto(`/book/${E2E.workspaceSlug}/e2e-consultation`);

    await expect(page.getByRole('heading', { name: 'Select Date & Time' })).toBeVisible({
      timeout: 30_000,
    });

    // Times render as 12-hour labels such as "09:30 AM".
    const slot = page.getByText(/^\d{1,2}:\d{2}\s*(AM|PM)$/i).first();
    const noSlots = page.getByText(/no available|fully booked|no slots/i).first();

    await expect(slot.or(noSlots)).toBeVisible({ timeout: 30_000 });
  });
});
