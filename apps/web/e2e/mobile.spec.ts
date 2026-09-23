import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { E2E } from './fixtures';

/**
 * Small-screen layout.
 *
 * The dashboard was built and reviewed at desktop width, where a row of
 * controls always has room. At 375px it does not: the appointments week
 * toolbar laid two button groups out with `justify-between` and no wrapping,
 * so "New Appointment" was pushed off the right edge and clipped by the
 * dashboard shell -- cut off, not scrollable.
 *
 * Two different checks, because they catch different failures:
 *
 *  - Document overflow (`scrollWidth`) catches a page that scrolls sideways.
 *    It did NOT catch the toolbar bug: the dashboard shell clips overflow, so
 *    the button was cut off without the document ever growing. Kept because
 *    it is cheap and catches a different failure elsewhere.
 *  - Bounding boxes catch a control pushed past the right edge whether or not
 *    anything scrolls. This is the check that went red when the fix was
 *    reverted, and the one to trust for clipped layouts.
 *
 * Wide tables and the calendar grid may scroll inside their own containers.
 *
 * Signing in happens once, in `beforeAll`, and the session is shared. Login
 * is rate-limited to 10 per 15 minutes per address; a suite that signs in per
 * test exhausts that on its own, and the failure looks like a broken page
 * rather than a throttle. It also makes the suite several times faster.
 */

const PHONE = { width: 375, height: 667 };

/** Saved browser session for the fixture owner. Written by beforeAll. */
const OWNER_STATE = 'apps/web/e2e/.auth/owner.json';

test.use({ viewport: PHONE });

/** How far the document overflows its own viewport, in px. 0 is the goal. */
async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

/** Every visible button or link whose box crosses the viewport's right edge. */
async function clippedControls(page: Page): Promise<string[]> {
  return page.evaluate((maxX) => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll('button, a[href]'))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      // Fully off-canvas is a drawer parked out of view by design (the mobile
      // nav sits at x < 0 until opened). A control that is *partly* on screen
      // and runs past the right edge is the clipping bug this looks for.
      const partlyVisible = r.left < maxX && r.right > 0;
      if (!partlyVisible || r.right <= maxX + 1) continue;
      // A control inside a horizontally scrolling ancestor is reachable by
      // scrolling that ancestor, which is the intended pattern for a wide
      // tab strip or table. Only a control with no such ancestor is clipped.
      let scrollable = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if ((ox === 'auto' || ox === 'scroll') && a.scrollWidth > a.clientWidth + 1) {
          scrollable = true;
          break;
        }
      }
      if (!scrollable) {
        const text = (el.textContent || '').trim().slice(0, 30);
        out.push(`${el.tagName.toLowerCase()} "${text}" right=${Math.round(r.right)}`);
      }
    }
    return out;
  }, PHONE.width);
}

test.describe('phone width · 375px · public pages', () => {
  test('the public booking page does not scroll sideways', async ({ page }) => {
    await page.goto(`/book/${E2E.workspaceSlug}`);
    await expect(page.getByText(E2E.workspaceName)).toBeVisible();

    expect(await horizontalOverflow(page)).toBe(0);
  });

  test('the login page does not scroll sideways', async ({ page }) => {
    // Must run without a session: middleware redirects a signed-in user
    // away from /login, and the test would silently measure /appointments.
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    expect(await horizontalOverflow(page)).toBe(0);
  });
});

test.describe('phone width · 375px · dashboard', () => {
  test.beforeAll(async ({ browser }) => {
    // One real login for the whole block. The saved state carries the
    // session cookie into every test's fresh context below.
    //
    // `storageState: undefined` is load-bearing. The `browser` fixture merges
    // this describe's `test.use({ storageState })` into every newContext()
    // made inside it -- including this one -- so without the override the
    // login context tries to load the file this hook exists to create.
    const context = await browser.newContext({ viewport: PHONE, storageState: undefined });
    const page = await context.newPage();
    await page.goto('/login');
    await page.fill('input[name="email"]', E2E.email);
    await page.fill('input[name="password"]', E2E.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30_000 });

    mkdirSync(dirname(OWNER_STATE), { recursive: true });
    await context.storageState({ path: OWNER_STATE });
    await context.close();
  });

  test.use({ storageState: OWNER_STATE });

  test('the appointments list does not scroll sideways', async ({ page }) => {
    await page.goto('/appointments');
    await page
      .getByRole('button', { name: /new appointment/i })
      .first()
      .waitFor();

    expect(await horizontalOverflow(page)).toBe(0);
  });

  test('the appointments calendar view does not scroll sideways', async ({ page }) => {
    // Note: this passed even with the toolbar bug present. The shell clips
    // instead of scrolling. The bounding-box tests below are what catch it.
    await page.goto('/appointments?clview=true');
    await page
      .getByRole('button', { name: /new appointment/i })
      .first()
      .waitFor();

    expect(await horizontalOverflow(page)).toBe(0);
  });

  for (const view of [
    { name: 'list', url: '/appointments' },
    { name: 'calendar', url: '/appointments?clview=true' },
  ]) {
    test(`no button in the ${view.name} view is clipped by the right edge`, async ({ page }) => {
      // Generic form of the toolbar check: every visible button must fit.
      // Catches the next control someone adds to a non-wrapping row, without
      // this test having to know its name.
      await page.goto(view.url);
      await page
        .getByRole('button', { name: /new appointment/i })
        .first()
        .waitFor();

      const clipped = await clippedControls(page);
      expect(clipped, 'controls past the viewport edge: ' + clipped.join(' | ')).toEqual([]);
    });
  }

  test('both week-toolbar actions stay within the viewport', async ({ page }) => {
    // The reported bug, by name. Asserting on geometry rather than
    // visibility: an element can be "visible" to Playwright while sitting
    // past the right edge of a container that clips it.
    await page.goto('/appointments?clview=true');

    for (const name of [/fast pass/i, /new appointment/i]) {
      const box = await page.getByRole('button', { name }).first().boundingBox();
      expect(box, `${name} has no box`).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(PHONE.width);
    }
  });
});
