# Production Readiness Audit

**Date:** 2026-09-21
**Commit audited:** `30f6e46`
**Scope:** Whole repository — Next.js web app, FastAPI service, worker, shared packages, database, CI/CD, deployment.

## Status

| #   | Finding                                            | Severity       | Status                                                                                     |
| --- | -------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------ |
| A-1 | Unauthenticated tenant-creating API surface        | HIGH (latent)  | **Fixed & deployed** — PR #53. `/api/py/*` now returns 404 in production, verified live    |
| E-1 | Payment verification untested                      | HIGH           | **Fixed** — PR #53, 18 tests                                                               |
| D-1 | Group capacity: no backstop, no tests              | HIGH           | **Fixed** — PR #53, 9 tests incl. 8-way concurrency                                        |
| D-2 | Two EXCLUDE constraints unverified                 | MEDIUM         | **Fixed** — PR #53, existence + type asserted                                              |
| F-1 | Two thirds of the suite never ran locally          | HIGH (process) | **Fixed** — all three suites now run; see Testing below                                    |
| B-1 | Isolation tested at the guard, not call sites      | MEDIUM         | **Fixed** — PR #54, 17 tests incl. positive controls                                       |
| C-1 | Password reset timing oracle                       | MEDIUM         | **Fixed** — PR #55, 22.6 s vs 150 ms differential closed                                   |
| C-2 | Signup states whether an email is registered       | MEDIUM         | **Accepted** — see note below                                                              |
| C-3 | Rate-limit key is attacker-controlled              | MEDIUM         | **Fixed** — PR #56, rightmost hop trusted, 9 tests                                         |
| A-3 | Superuser database credentials                     | MEDIUM         | **Fixed & deployed** — PR #57, app runs as `bookings_app`; DROP and COPY TO PROGRAM denied |
| F-2 | Zero E2E/browser tests                             | MEDIUM         | **Fixed** — PR #58, 24 Chromium tests                                                      |
| G-1 | No structured logging; logs leaked PII and secrets | MEDIUM         | **Fixed** — PR #60, JSON lines, request ids, redaction by key, 10 tests                    |
| G-2 | Unvalidated upstream `x-request-id`                | LOW            | **Fixed in PR #61 (open, not deployed)** — 5 unit + 2 E2E tests                            |
| I-1 | No privilege-escalation tests                      | MEDIUM         | **Closed in PR #61 (open)** — no vulnerability found; 14 tests now prove it                |
| H-1 | CI/CD non-functional (Actions billing)             | HIGH (process) | Open — external blocker; verified 0 jobs execute, so repo-side tuning saves nothing        |
| H-2 | Production disk at 75–92%                          | MEDIUM         | **Fixed** — resized 7.8 GB → 16 GB on 2026-09-21; now 38%, 9.4 GB free, no downtime        |

**On C-2 (signup enumeration):** deliberately not "fixed". Removing "an account with this email already exists" degrades signup UX badly for every honest user, and the same information is obtainable from the login form in any product that reports a wrong password distinctly. GitHub, Google and most mainstream products make the same trade. The timing oracle in C-1 was worth closing because it cost nothing to close; this one is not.

### Test suite as it stands

| Suite                       | Before           | Now       | Command                                                   |
| --------------------------- | ---------------- | --------- | --------------------------------------------------------- |
| Unit                        | 193              | **246**   | `npx vitest run`                                          |
| Integration (real Postgres) | 77               | **147**   | `npm run test:integration`                                |
| E2E (Chromium)              | 0                | **38**    | `npm run test:e2e`                                        |
| Python                      | 42 (+14 skipped) | unchanged | `cd apps/api && .venv/Scripts/python -m pytest tests/ -q` |

**473 tests, all green**, up from 312 of which only 193 were ever being run locally. The Python suite is unchanged in count but previously could not run at all — see [TESTING.md](./TESTING.md#running-the-python-suite).

The integration and E2E suites both need `DATABASE_URL` pointing at a **disposable** database — integration `TRUNCATE`s every table and E2E drops and recreates its own workspace. `REDIS_URL` is needed for the Redis limiter suite. E2E additionally needs a build (`npm run build`), since it runs against `next start`.

## How to read this

Every finding is marked with how it was established:

- **[verified]** — I reproduced or read the code path myself.
- **[reviewed]** — surfaced by a focused code review pass; code reference given, not independently reproduced end to end.

Severity reflects **current, real-world exploitability in this deployment**, not textbook severity. A dangerous code path that is currently unreachable is marked as latent and says so.

---

## 0. System summary

Turborepo monorepo, deployed as four containers behind nginx at `booking.futureacad.ae`:

| Component     | Stack                                                                             | Role                                                                               |
| ------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `apps/web`    | Next.js 16 (App Router, Server Actions)                                           | The entire product: dashboard + public booking pages                               |
| `apps/api`    | FastAPI (Python)                                                                  | Parallel re-implementation of booking + auth. **Not used by the product.** See A-1 |
| `apps/worker` | Node long-lived process                                                           | Sweeps and sends due reminders/follow-ups                                          |
| `packages/*`  | `auth`, `core`, `database` (Prisma 7), `notifications`, `ui`, `features/services` | Shared logic                                                                       |

Datastores: PostgreSQL 16, Redis 7.

**Tenancy model:** shared database, shared schema. `Workspace` is the tenant. Access is via `WorkspaceMember` rows carrying a `Role` (`OWNER` 40 > `ADMIN` 30 > `STAFF` 20 > `RECEPTIONIST` 10), enforced by `requireWorkspace(workspaceId, minRole)` in `apps/web/lib/session.ts`.

**Double-booking defence:** PostgreSQL `EXCLUDE USING gist` constraints, not application checks:

- `bookings_no_staff_overlap` — same staff, overlapping time. Exempts group-service rows.
- `bookings_no_cross_service_staff_overlap` — same staff, _different_ service, overlapping time.
- `booking_participants_no_staff_overlap` — collective-booking participants.

---

## A. Architecture

### A-1. `apps/api` is an unused, unauthenticated, tenant-creating API surface — HIGH (latent) [verified]

The FastAPI service exposes, with no authentication:

- `POST /api/auth/register` — creates a `User` + `Workspace` + `WorkspaceMember(role="OWNER")` + `Staff`, and issues a session cookie (`apps/api/app/routers/auth.py:108`).
- `POST /api/auth/login` — mints an `rb_session` cookie.
- `POST /api/bookings`, `GET /api/services`, `GET /api/availability`.

These are genuinely mounted (`apps/api/main.py:28-29` includes both routers), and the session tokens are the _same_ format and _same_ table as the Next.js app — so a session minted here is valid for the whole dashboard.

It is reachable by design: `apps/web/next.config.mjs:111` rewrites `/api/py/:path*` to it, `docker-compose.prod.yml` sets `PYTHON_API_URL: http://api:8000`, and `apps/web/middleware.ts:71` **explicitly excludes `api/` from the auth matcher**, so nothing gates it at the edge.

**Why this is "latent" rather than "critical":** probing production directly returns HTTP 500 on every `/api/py/*` path including `/health`, so the proxy hop is currently broken and the endpoints are not presently reachable from the internet. That is the only thing standing between this and unauthenticated tenant creation on a production system.

Nothing in `apps/web` calls this service — the entire product uses server actions and Prisma. The only references to `/api/py` in the repo are the rewrite itself, `README.md`, and `.env.example`.

**Fix:** remove the `/api/py/*` rewrite. Whether to keep the service at all is a product decision (it has 56 pytest tests and a CI job, so it was built deliberately) — but it should not be publicly routed while nothing consumes it.

### A-2. Two parallel implementations of the same business logic — MEDIUM [verified]

Slot generation, password policy, session issuing and booking creation each exist twice: once in TypeScript (the live one) and once in Python. They can drift silently, and the Python copy is the one nobody exercises in production. This is the root cause of A-1 rather than a separate problem.

### A-3. Database credentials are the Postgres superuser — MEDIUM [reviewed]

`docker-compose.prod.yml:67` hands web, migrate, worker and api the same superuser `DATABASE_URL`. A SQL-injection or RCE anywhere becomes full database compromise, and the app has no need for DDL at runtime (migrations run as a separate step). A least-privilege application role is the correct shape.

---

## B. Multi-Tenancy

**Verdict: the isolation model is sound and consistently applied. This was the single best-audited area and I found no cross-tenant read/write path.**

- Every dashboard server action calls `requireWorkspace(...)` before touching a client-supplied id, and re-scopes that id by `workspaceId` in the Prisma query rather than trusting a bare `findUnique(id)` — confirmed across all 12 `'use server'` files in an earlier dedicated pass.
- The public booking flow resolves services and staff scoped to the workspace; a foreign `serviceId` does not resolve.
- `apps/api`, despite A-1, does filter by `workspace_id` correctly on every query.

### B-1. Isolation is tested at the guard, not at the call sites — MEDIUM [reviewed]

`apps/web/test/integration/tenant-isolation.spec.ts` proves `resolveWorkspaceAccess` rejects a foreign workspace id, and two data-level assertions exist in `public-booking.spec.ts`. But there is **no test that workspace A cannot read or modify workspace B's bookings, customers, staff or services through the dashboard actions**. The guarantee currently rests on every author remembering to call the guard. One omission is a tenant breach that nothing would catch.

This is the highest-value test gap in the repository.

---

## C. Authentication & Session Management

**Verdict: genuinely well built. Do not rewrite.** [reviewed]

Confirmed sound:

- Session tokens: 32 bytes from `randomBytes`, base64url, **SHA-256 hashed at rest** — plaintext never stored (`packages/auth/src/tokens.ts:22-29`).
- Revocation is immediate: every request re-reads the session and memberships from the database (`packages/auth/src/session.ts:86-129`), so role changes and deactivations take effect on the next request.
- Cookie flags correct: `httpOnly`, `secure` in production, `sameSite=lax`, explicit expiry.
- Password policy enforced server-side on all four paths that set a password (signup, change, reset, invite accept); bcrypt's 72-byte limit is rejected rather than silently truncated.
- Per-**account** throttling exists in addition to per-IP on login and password reset.
- No signup privilege escalation: role is hardcoded `OWNER` on a newly created workspace; the signup input has no workspace or role field.
- Password change and reset revoke all sessions transactionally; reset tokens are single-use.
- No `route.ts` handlers exist anywhere, so all mutations go through server actions and inherit Next's origin check.

### C-1. Password reset leaks account existence via timing — MEDIUM [reviewed]

`apps/web/app/reset-password/actions.ts:95` awaits `sendMail()` inline for a registered address, while the unregistered path sleeps 120–200 ms (`:80`). The response is carefully neutral in wording, but an attacker timing the request separates registered from unregistered addresses (SMTP round trip vs sub-200 ms). Enumerates the customer list.

**Fix:** dispatch the mail without blocking the response.

### C-2. Signup states outright whether an email is registered — MEDIUM [reviewed]

`apps/web/app/signup/actions.ts:117-124` returns "An account with this email already exists." That is an explicit enumeration oracle, capped only by a spoofable per-IP limit.

### C-3. Rate-limit keys are attacker-controlled — MEDIUM [verified, pre-existing and documented]

`callerKey()` (`apps/web/lib/rate-limit.ts`) takes the first `X-Forwarded-For` hop with no trusted-proxy configuration. Rotating the header defeats every public limit. The limiter's own doc comment already acknowledges this as a deterrent rather than a boundary, so it is a known trade-off — but with nginx now definitively in front (`booking.futureacad.ae`), it is finally fixable properly by trusting only the proxy-set hop.

---

## D. Booking Engine & Business Logic

A dedicated correctness review of the booking engine found 11 issues; the significant ones were fixed and deployed in PR #48. Remaining:

### D-1. Group-capacity enforcement has no database backstop and no tests — HIGH [verified]

Group services (`Service.capacity > 1`) are deliberately exempted from `bookings_no_staff_overlap`, because several customers legitimately share one slot. Capacity is instead enforced purely in application code — `apps/web/lib/booking-capacity.ts`, via `pg_advisory_xact_lock` then count-then-insert.

That is a reasonable design (Postgres cannot express "at most N rows sharing this slot" in an EXCLUDE constraint), **but it is the sole defence against overselling a group session and it has zero test coverage.** The one constraint that _is_ well tested (`bookings_no_staff_overlap`, 8 integration tests + a CI existence check) is precisely the one that no longer applies to this path.

### D-2. Two of three EXCLUDE constraints are unverified — MEDIUM [reviewed]

`booking_participants_no_staff_overlap` and `bookings_no_cross_service_staff_overlap` have no tests and no CI existence check, unlike `bookings_no_staff_overlap` which CI greps `pg_constraint` for. A migration ordering mistake could silently drop them and nothing would notice.

### D-3. Waitlist claim path is largely untested — MEDIUM [verified]

`apps/web/lib/waitlist.ts` (594 lines) has zero tests. It was rewired in PR #48 to route through the capacity-aware creation helper; that rewiring is unverified by any test.

---

## E. Payments

### E-1. Payment verification has zero tests — HIGH [reviewed]

`apps/web/lib/payments/{razorpay,stripe}.ts` (~356 lines) has no test coverage at all. Signature verification and amount-tampering resistance are entirely unverified. The code re-derives provider and order id server-side and checks the signature before any write (confirmed in an earlier review), and PR #48 added a `status: 'PENDING'` precondition so a replayed signature can no longer resurrect a cancelled booking — but none of that is pinned down by a regression test.

This is the highest-value _untested_ code in the repository measured by blast radius: a regression here is a direct revenue or fraud incident.

---

## F. Testing

### F-1. The suite I have been running is only a third of the real suite — HIGH (process) [verified]

`npx vitest run` reports "17 files / 193 tests". `vitest.config.mts:11` **excludes `**/test/integration/**`**. The real picture:

| Suite                               | Files | Tests | Command                                                 |
| ----------------------------------- | ----- | ----- | ------------------------------------------------------- |
| Unit (vitest)                       | 17    | 193   | `npx vitest run`                                        |
| Integration (vitest, real Postgres) | 7     | ~77   | `npx vitest run --config vitest.integration.config.mts` |
| Python (pytest)                     | 3     | ~56   | `cd apps/api && python -m pytest tests/ -q`             |

Every "tests pass" claim made during recent work covered only the unit third. The integration suite needs a disposable `DATABASE_URL` (it `TRUNCATE`s) and `REDIS_URL`. CI ran all three when GitHub Actions was working; it has not run since the Actions billing block, so **nothing has executed the integration or Python suites in days.**

### F-2. Zero end-to-end / browser tests — MEDIUM [verified]

No Playwright, no Cypress, no config, no dependency. The entire `apps/web` UI layer — every form, every button, every role-gated view — is untested. The booking funnel a customer actually walks through is verified only at the server-action layer.

### F-3. `npm test` does not run what you would expect — LOW [verified]

`npm test` → `turbo run test`, which only reaches `@bookings/core`, `@bookings/auth`, `@bookings/notifications` (the only packages with a `test` script). `apps/web` has **no test script**, so its 38 unit tests run only via root `npx vitest run`. `apps/api` and `apps/worker` have no `package.json` at all.

### Riskiest untested paths, ranked

1. Group/collective/resource capacity (`lib/booking-capacity.ts`) — sole defence, zero tests
2. Cross-tenant access through dashboard server actions (B-1)
3. Payments (E-1)
4. `apps/web/app/book/actions.ts` — 1,678 lines; integration tests cover only the happy path
5. `lib/waitlist.ts` — zero tests
6. `packages/notifications/src/dispatch.ts` — channels tested, the fan-out dispatcher is not
7. The entire UI

---

## G. Dependencies

`npm audit`: **6 vulnerabilities (4 high, 2 moderate)** — all transitive, none plausibly exploitable here. [verified]

| Package           | Severity  | Path                        | Assessment                                                                                  |
| ----------------- | --------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `deepmerge-ts` <8 | high      | `prisma` → `@prisma/config` | Stack exhaustion on recursive merge. Build/CLI-time only.                                   |
| `mysql2` <=3.23.0 | high (×2) | `prisma`                    | **MySQL driver in a Postgres-only app.** No MySQL connection is ever opened. Not reachable. |
| `uuid` <11.1.1    | moderate  | `exceljs`                   | Bounds check on v3/v5/v6 _when `buf` is passed_. Our export code never passes `buf`.        |

**Do not run `npm audit fix --force`.** It "fixes" these by _downgrading_ Prisma 7 → 6.19.3 and exceljs → 3.4.0, which would break the application. Correct action is to wait for upstream patches and document the accepted risk, which this table does.

---

## H. Deployment, CI/CD & Operations

### H-1. CI/CD is entirely non-functional — HIGH (process) [verified]

The GitHub Actions account is over its billing/quota limit. Consequences:

- No lint, typecheck, unit, integration, Python or migration-drift checks have run on any commit for days.
- The Deploy workflow cannot build or publish images, so every deploy is currently a manual local build → push to GHCR → pull on the host.
- Scheduled workflows were failing every 10 minutes until disabled (PRs #50, #51).

This is the single biggest process risk: changes are reaching production with only whatever verification is run by hand.

### H-2. Production host is chronically short of disk — MEDIUM [verified]

The LXC container has a 7.8 GB disk running at 75–92%. Every deploy has required manual intervention: the sequential image pull fails on the largest image, aborting the script _before_ the cutover step, leaving earlier-pulled images unapplied. Root fix is a disk resize; the workaround (cut over web/api first to free layers, then pull worker) has been performed by hand repeatedly.

### H-3. `NEXT_PUBLIC_*` build-time trap — RESOLVED [verified]

`NEXT_PUBLIC_APP_URL` is inlined by `next build`, not read at runtime. The Dockerfile never passed it as a build arg, so every invitation email linked to `localhost:3000` regardless of what production `.env` said. Fixed in PR #49 (build arg + wired into `deploy.yml`).

### H-4. Operator access is LAN-only — LOW (constraint) [verified]

The production host is `192.168.1.162`, reachable by SSH only from the local network. Off-network, the public site is reachable over HTTPS but the box is not administrable. Worth knowing before an incident.

---

## I. Priorities

| #   | Finding                                         | Severity       | Action                                                     |
| --- | ----------------------------------------------- | -------------- | ---------------------------------------------------------- |
| 1   | A-1 unauthenticated tenant-creating API surface | HIGH (latent)  | Remove the `/api/py/*` rewrite                             |
| 2   | F-1 two-thirds of the test suite never runs     | HIGH (process) | Run integration + Python suites; get them runnable locally |
| 3   | D-1 group capacity has no backstop and no tests | HIGH           | Write concurrency tests for capacity                       |
| 4   | E-1 payments untested                           | HIGH           | Write signature/tamper regression tests                    |
| 5   | B-1 tenant isolation tested at guard only       | MEDIUM         | Add per-resource cross-tenant test matrix                  |
| 6   | C-1/C-2 account enumeration                     | MEDIUM         | Non-blocking mail dispatch; neutral signup response        |
| 7   | C-3 spoofable rate-limit key                    | MEDIUM         | Trust only the nginx-set hop                               |
| 8   | D-2 two EXCLUDE constraints unverified          | MEDIUM         | Add existence + behaviour tests                            |
| 9   | A-3 superuser database credentials              | MEDIUM         | Least-privilege application role                           |
| 10  | H-2 production disk                             | MEDIUM         | Resize the Proxmox volume                                  |

Items 1–4 are the ones that would cause a real incident. Everything above the line in the table is addressed in subsequent phases; this document is updated as each lands.
