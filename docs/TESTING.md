# Testing

Four suites, three of which need something running. The commands below are the real ones — check `package.json` before trusting any other guide.

## The suites

| Suite       | Tests            | Needs                                       | Command                                                   |
| ----------- | ---------------- | ------------------------------------------- | --------------------------------------------------------- |
| Unit        | 246              | nothing                                     | `npx vitest run`                                          |
| Integration | 152              | PostgreSQL, Redis                           | `npm run test:integration`                                |
| E2E         | 45               | PostgreSQL, a build                         | `npm run test:e2e`                                        |
| Python      | 42 (+14 skipped) | its own venv (skipped ones need a database) | `cd apps/api && .venv/Scripts/python -m pytest tests/ -q` |

**`npm test` does not run all of these.** It maps to `turbo run test`, which only reaches the three packages that define a `test` script — `@bookings/core`, `@bookings/auth`, `@bookings/notifications`. `apps/web` has no `test` script, so its unit tests run only through the root `npx vitest run`. This has bitten before; assume any "tests pass" claim covers only what was actually invoked.

## Why the split

`vitest.config.mts` **excludes `**/test/integration/**`**. The unit suite is pure functions only — no database, no mocks (`vi.mock` appears nowhere in the repository). Anything that needs a real PostgreSQL lives in the integration config, because the behaviour it covers cannot be reproduced against a fake:

- exclusion constraints rejecting a concurrent double-booking
- advisory-lock capacity enforcement under eight racing requests
- tenant isolation through the real server actions
- the availability engine against real schedules and overrides

## Running the integration suite

It **`TRUNCATE`s every table between tests.** Point it at a disposable database.

```bash
# bring up the local stack
docker compose -f docker/docker-compose.yml up -d postgres redis

# a database that is not your dev one
createdb bookings_test        # or CREATE DATABASE from psql

DATABASE_URL="postgresql://postgres:password123@localhost:5434/bookings_test" \
  npx prisma migrate deploy --schema packages/database/prisma/schema.prisma

DATABASE_URL="postgresql://postgres:password123@localhost:5434/bookings_test" \
REDIS_URL="redis://localhost:6379" \
  npm run test:integration
```

Files run serially (`fileParallelism: false`) because they share one database.

**Known intermittent — measured, not hand-waved.** Across three consecutive full runs of the integration suite on the same commit, two were clean (147/147) and one failed 4 tests: the cross-tenant export-leak test and three in `scheduled-workflows.spec.ts`. Every one of them passed when its file was run alone. `group-capacity.spec.ts` has failed the same way before, in `resetDatabase()`.

The common factor is the shared database and the `TRUNCATE` in `beforeEach`, so this looks like harness contention rather than an application fault — but that is a hypothesis, not a diagnosis, and it has not been root-caused. **Roughly a 1-in-3 chance of a red full run.** Re-run before investigating, and treat a repeat of the _same_ test failing as a real finding rather than noise.

## Running the E2E suite

Playwright, Chromium only. Runs against `next start` rather than `next dev`, because middleware and caching behave differently and it is production behaviour these protect.

```bash
npm run build

DATABASE_URL="postgresql://postgres:password123@localhost:5434/bookings_test" \
  npm run test:e2e
```

Seeding happens automatically — `globalSetup` in `playwright.config.ts` runs the fixtures before every run. Do not seed once by hand and rely on it: the integration suite `TRUNCATE`s every table in the same database, and E2E run afterwards then fails in a cascade that looks like application bugs rather than missing data. (`npm run test:e2e:seed` still exists for seeding a database to click through by hand.)

The fixtures delete and recreate only their own workspace, so the suite is safe against a database holding other fixtures. The fixture service is free by design, so the booking funnel confirms rather than diverting to a payment gateway that has no credentials in a test environment.

## Running the Python suite

It needs its own virtualenv — `requirements.txt` wants FastAPI `>=0.141.1`, and against an older one (which a system interpreter may well have) collection dies on `httpx.Client(app=...)`, removed in httpx 0.28, before any test runs.

```bash
cd apps/api
python -m venv .venv                          # gitignored
.venv/Scripts/python -m pip install -r requirements.txt   # Scripts on Windows, bin elsewhere
.venv/Scripts/python -m pytest tests/ -q
```

The venv also isolates `app` from anything on the system path. `apps/api/app/__init__.py` exists specifically so that `app` is a regular package rather than a namespace one — without it, any `app.py` on a later `sys.path` entry silently wins and every import fails with `'app' is not a package`. Do not delete it because it looks empty.

## What is covered, and what is not

**Well covered**

- Slot generation and timezone maths (32 unit tests — the best-covered thing in the repository)
- The double-booking guarantee, including concurrency
- Group capacity, including 8-way races and overlap-vs-exact-start counting
- Tenant isolation at both the guard and the call sites
- Payment signature verification and fail-closed behaviour
- Route protection across all 14 dashboard routes
- Availability across a multi-staff pool, including per-staff overrides and collective participations
- Privilege escalation inside a workspace (STAFF/RECEPTIONIST/ADMIN reaching above their rank)
- The platform-admin boundary: an ordinary workspace owner refused the cross-tenant `/super-admin` view, a genuine platform admin seeing real data for every organization
- Log redaction asserted on the serialised output line, not just the redactor's return value
- Upstream `x-request-id` validation, including oversized and hostile values
- Phone-width layout (375px): no sideways document scroll, and no control clipped by the right edge, on the public booking page, login, and both appointments views

**Not covered**

- Most dashboard UI beyond route protection and sign-in
- The reschedule flows end to end through the browser
- `apps/api`, beyond its own pytest suite — it is not used by the product
- Load and soak behaviour of any kind

## Conventions

- **No mocking.** `vi.mock` is used nowhere. Unit tests import pure functions; anything needing a database goes in the integration suite. The one fake is `InMemoryServiceRepository`.
- **Know what a check can and cannot see.** The phone-width suite has two checks because they catch different failures. `document.scrollWidth` catches a page that scrolls sideways -- and passed with the toolbar bug present, because the dashboard shell clips overflow instead of scrolling. Bounding boxes catch a control pushed past the right edge whether or not anything scrolls, and are the check that went red when the fix was reverted. Controls inside an `overflow-x: auto` ancestor are exempt: a swipeable tab strip is reachable, not clipped, and the Smart Waitlist tab was flagged as a bug for exactly that reason before the exemption existed.
- **Tests must be able to fail.** Several suites here were validated by deliberately breaking the code they cover and confirming the expected tests went red — the capacity guard, the `X-Forwarded-For` hop selection, the password-reset `await`, and the availability busy-range grouping. A test that has only ever passed has not been shown to test anything. This is also how the multi-staff availability gap was found: discarding every busy interval in the engine was caught by exactly one test, because nothing covered a pool of more than one staff member.
- **Positive controls where a test asserts a refusal.** `cross-tenant-actions.spec.ts` runs the same calls against the caller's own resources and asserts success, so a refusal cannot pass for the wrong reason (malformed arguments, for instance).
- **Sign in once per spec file, not once per test.** Login is rate-limited to 10 attempts per 15 minutes per address, and the buckets live in Redis so they outlast a run. A spec that signs in per test exhausts that on its own, and the failure looks like a broken page (`waitForURL` timing out after submit) rather than a throttle -- which is exactly how it presented. `mobile.spec.ts` shows the pattern: one login in `beforeAll`, saved with `storageState`, shared by every test in the block. `globalSetup` also resets the buckets at the start of each run so back-to-back runs cannot poison each other. One caveat learned the hard way: the `browser` fixture merges the block's `test.use({ storageState })` into every `newContext()` made inside it, so the login context must pass `storageState: undefined` explicitly or it tries to load the file it is about to create.
- **Assert on the outcome, not the status code.** The export isolation test decodes the CSV and checks the other tenant's data is absent, rather than trusting a 403.

## CI

`.github/workflows/ci.yml` runs lint, typecheck, unit, integration (against a service container), the Python suite, a dependency audit and a migration-drift check.

**CI is currently not running** — the GitHub Actions account is over its billing limit. Until that is resolved, nothing verifies a push automatically and the suites above have to be run by hand before merging. This is the single largest process risk in the project.
