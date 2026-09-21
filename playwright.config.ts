import { defineConfig, devices } from '@playwright/test';

/**
 * Browser tests.
 *
 * Everything else in this repository stops at the server action; these are
 * the only tests that exercise the pages a customer and an owner actually
 * use, including route protection, which is enforced by middleware that no
 * unit or integration test runs.
 *
 * Needs a built app (`npm run build`) and DATABASE_URL pointing at a
 * disposable database — the fixtures drop and recreate their own workspace.
 * Run with:
 *
 *   DATABASE_URL=... npx playwright test
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './apps/web/e2e',
  // The suite shares one database and one server, so files do not overlap.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL: BASE_URL,
    // Kept only for failures: traces are large and this runs on a small box.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],

  webServer: {
    // The production server rather than `next dev`: middleware, caching and
    // server actions all behave differently under dev, and it is the
    // production behaviour these tests are meant to protect.
    command: `npm run start --workspace=@bookings/web -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
