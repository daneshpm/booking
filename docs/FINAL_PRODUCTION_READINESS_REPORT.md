# Final Production Readiness Report

**Date:** 2026-09-21
**Starting commit:** `30f6e46`
**Scope:** whole repository — audit, fixes, testing, and production changes.

Companion documents: [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) for the findings as discovered, [SECURITY.md](./SECURITY.md), [MULTI_TENANCY.md](./MULTI_TENANCY.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [TESTING.md](./TESTING.md), [DEPLOYMENT.md](./DEPLOYMENT.md), [API.md](./API.md), [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md).

---

## Summary

Fifteen findings. Thirteen closed, one accepted with reasoning, one blocked outside the repository. The test suite went from 312 tests — of which only 193 were ever actually being run — to 444, all green.

The two most consequential fixes were an unauthenticated endpoint that created tenants with OWNER access, and the application running as a database superuser. Both are live in production. The last batch of work (PR #60) is verified locally but still open for review, so read the sections below as describing the repository unless they say otherwise.

---

## Architecture

**Inspected:** the whole monorepo — web, worker, the FastAPI service, five shared packages, the Prisma schema and its twelve migrations, both compose files, all four workflow files, and the deployment scripts on the production host.

**Changed:**

- Removed the `/api/py/*` proxy to the FastAPI service. Documented in ARCHITECTURE.md as dead weight with a decision still owed on it.
- Split database credentials: `migrate` keeps superuser, everything else runs restricted.
- Added `/health` and `/health?ready=1`; the web application previously had no health endpoint at all.

**Not changed, deliberately:** the tenancy model, the session design, the exclusion-constraint approach to double-booking, and the layered domain model in `packages/features/services`. All three were examined and found sound; the first two are documented rather than rewritten.

---

## Multi-Tenancy

**Strategy:** shared database, shared schema. `Workspace` is the tenant; access is by `WorkspaceMember` carrying a numeric role rank; `requireWorkspace(workspaceId, minRole)` guards every dashboard server action.

**Verdict: sound, and consistently applied.** Every dashboard server action was read. Every one calls the guard before touching a client-supplied id and re-scopes that id inside the query rather than trusting a bare `findUnique`. No cross-tenant read or write path was found.

**What was missing was proof.** Isolation was asserted only at the guard function, not at the roughly forty call sites that must remember to use it — so a single omission in a future change would have been a tenant breach nothing would catch.

Added `cross-tenant-actions.spec.ts`: 17 tests driving the **real server actions** as a signed-in user of another tenant, covering both attack shapes — presenting a foreign `workspaceId`, and presenting one's own `workspaceId` alongside a foreign resource id. The export test decodes the CSV and asserts the other tenant's rows are absent rather than trusting a status code. Four positive controls run the same calls against the caller's own resources and assert success, so a refusal cannot pass for the wrong reason.

**Remaining limitation:** no row-level security. Isolation is an application property only.

---

## Security

### Fixed

| Finding                         | Severity      | What it was                                                                                                                                                                                                                                                                                     |
| ------------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unauthenticated tenant creation | HIGH (latent) | `POST /api/py/auth/register` created a User + Workspace + **OWNER** membership and minted a dashboard session cookie. `middleware.ts` excludes `api/`, so nothing gated it. Reachable by design via a rewrite; only a broken proxy hop kept it from being live.                                 |
| Database superuser at runtime   | MEDIUM        | Every container connected as `postgres`. Superuser carries `COPY ... FROM PROGRAM` — any SQL foothold was command execution on the database container.                                                                                                                                          |
| Password-reset timing oracle    | MEDIUM        | Registered addresses took **22.6 s** (awaiting SMTP inline), unregistered ~150 ms. The neutral wording was useless against a stopwatch.                                                                                                                                                         |
| Rate-limit bypass               | MEDIUM        | The limiter read the **leftmost** `X-Forwarded-For` hop — the caller-controlled one. Setting the header earned a fresh bucket per request, defeating every public limit.                                                                                                                        |
| Payment replay                  | HIGH          | Confirmation had no status precondition; a replayed valid signature could resurrect a cancelled booking.                                                                                                                                                                                        |
| CSV formula injection           | HIGH          | A customer name of `=cmd\|'/c calc'!A1` executed when an admin opened an export.                                                                                                                                                                                                                |
| Invite-flow bypass              | MEDIUM        | Role changes could create a membership for any existing user, with no invitation and no consent.                                                                                                                                                                                                |
| Unvalidated image fields        | MEDIUM        | Logos and avatars are base64 data URLs written to text columns, validated **only in the browser**. A caller skipping the browser could store an arbitrarily large string, an SVG (a document that can carry script), or a remote URL that would beacon every dashboard viewer to a third party. |
| Missing rate limits             | MEDIUM        | Waitlist-claim and accept-invite had none, while every sibling public action did.                                                                                                                                                                                                               |

### Verified sound, left alone

Session tokens (32 random bytes, SHA-256 at rest, immediate revocation), cookie flags, bcrypt cost 12 with server-side policy on all four password paths, single-use reset tokens, transactional session revocation on password change, payment signature verification with `timingSafeEqual`, Stripe re-fetching the session server-side, security response headers, and the absence of any inbound webhook route.

### Accepted

**Signup reveals whether an email is registered.** Removing it degrades signup for every honest user, and any login form distinguishing a wrong password leaks the same fact. The _timing_ oracle was closed because that cost nothing.

**Six transitive npm advisories**, all unreachable — the loudest is a MySQL driver in a Postgres-only application. `npm audit fix --force` would downgrade Prisma 7 → 6 and break the build.

**Rate limiting is bypassable from the LAN**, since port 3000 is published on all interfaces for a proxy on another host.

### Security testing performed

Injection, XSS, path-traversal, template- and command-injection payloads fired at the public booking flow (`malicious-input.spec.ts`, 12 tests), asserting the schema and constraints survive. Prisma parameterises every query, so injection is structurally prevented rather than filtered; these tests exist to notice if a hand-built raw query ever changes that.

---

## Authentication & Authorization

**Mechanism:** opaque session tokens, database-backed, SHA-256 hashed at rest, 7-day absolute expiry, no sliding renewal. Memberships re-read per request, so revocation and role changes take effect on the next request.

**Roles:** `OWNER` 40 > `ADMIN` 30 > `STAFF` 20 > `RECEPTIONIST` 10, compared numerically.

**Verified:** no privilege escalation at signup (role is hardcoded on a freshly created workspace; the input has no role field); invitations take their role from the database row and bind to the invited address; OWNER is never grantable by invitation.

**Browser-verified:** all 14 dashboard routes redirect to `/login` when signed out, a wrong password is refused, an unknown address is refused _without revealing that it is unknown_, and clearing the session cookie puts the dashboard back out of reach.

---

## Booking System

The correctness guarantee lives in PostgreSQL: three `EXCLUDE USING gist` constraints rather than check-then-insert, because an application check cannot stop two concurrent requests from both passing it.

**Group capacity is the deliberate exception** — group rows are exempt from the overlap constraint (several customers sharing a slot is the feature), so capacity is enforced by `pg_advisory_xact_lock` plus count-then-insert. That made it the single most dangerous untested path in the codebase.

Now covered: capacity holding under **eight concurrent claims**, seats counted by **time overlap rather than identical start** (add-ons make duration vary per booking), and the existence and type of **all three** exclusion constraints — two of which nothing had ever verified.

Timezones are stored as `timestamptz` throughout and resolved at the boundary with `date-fns-tz`; slot generation has the best unit coverage in the repository (32 tests).

---

## Testing

| Category                      |   Tests |  Passed | Failed |
| ----------------------------- | ------: | ------: | -----: |
| Unit                          |     233 |     233 |      0 |
| Integration (real PostgreSQL) |     133 |     133 |      0 |
| E2E (Chromium)                |      36 |      36 |      0 |
| Python (pytest)               |      42 |      42 |      0 |
| **Total**                     | **444** | **444** |  **0** |

(14 further Python tests skip without a database.)

Security and multi-tenant tests are counted within the integration and E2E rows: 12 malicious-input, 17 cross-tenant, 9 capacity, 9 caller-address, 18 payment, 4 reset-timing, 14 route-protection, 5 multi-staff availability.

**The most important finding here was about the process, not the code.** `vitest.config.mts` excludes `test/integration/**`, so `npx vitest run` — the command everyone uses — reported 193 passing tests while 77 integration tests and 56 Python tests silently never ran. Combined with CI being down, nothing had executed two thirds of the suite in days. Both now have npm scripts and are documented.

**The Python suite could not run at all, for two stacked reasons**, both found only by running it:

1. `apps/api/app/` had no `__init__.py`, so `app` was merely a _namespace-package candidate_. Python keeps scanning `sys.path` past one of those, and a stray editable install on this machine put a plain `app.py` on a later entry — which won. Every `from app...` import failed with `'app' is not a package`. One `__init__.py` makes it a regular package that resolves at the first entry and cannot be shadowed. The dependency was latent in the repository; any machine with an `app` module anywhere on its path hits it.
2. The interpreter had FastAPI 0.109 installed while `requirements.txt` requires `>=0.141.1`, and old Starlette's `TestClient` calls `httpx.Client(app=...)`, removed in httpx 0.28. Collection died before a single test ran.

Fixed the first in the repository; fixed the second with a gitignored `apps/api/.venv` rather than upgrading this machine's global packages, which other projects here depend on. 42 pass, 14 skip without a database.

**Tests were validated by breaking the code they cover.** The capacity guard, the `X-Forwarded-For` hop selection, the password-reset `await` and the availability busy-range grouping were each reverted deliberately to confirm the relevant tests went red, then restored. A test that has only ever passed has not been shown to test anything.

**That exercise found a real coverage gap.** Discarding _every_ busy interval in the availability engine — which should mean the site offers times that are already booked — was caught by exactly one test. The engine had no multi-staff coverage at all, so pooling one staff member's bookings onto another was invisible. `availability-multi-staff.spec.ts` (5 tests) now covers per-staff bookings, day-off overrides and collective participations; the pooling mistake makes it fail.

**One intermittent observed:** `group-capacity.spec.ts` failed once in `resetDatabase()` (the `TRUNCATE` in `beforeEach`) during a run under heavy parallel load, and passed on the three runs either side. It is a test-harness contention flake rather than an application fault, but it is unproven either way and is recorded here rather than dismissed.

---

## Dependency Security

`npm audit`: 6 vulnerabilities (4 high, 2 moderate), all transitive, none reachable.

| Package           | Severity | Path                        | Status                                                                 |
| ----------------- | -------- | --------------------------- | ---------------------------------------------------------------------- |
| `deepmerge-ts` <8 | high     | `prisma` → `@prisma/config` | Accepted — build-time only                                             |
| `mysql2` ≤3.23.0  | high ×2  | `prisma`                    | Accepted — MySQL driver, Postgres-only app, never connects             |
| `uuid` <11.1.1    | moderate | `exceljs`                   | Accepted — the bug needs a `buf` argument the export code never passes |

`npm audit fix --force` would downgrade Prisma 7 → 6 and exceljs to 3.4.0, breaking the application. Documented rather than "fixed".

---

## Observability

**Was: nothing.** 60 `console.log`/`console.error` calls writing human sentences to stdout, with no request id, no level and no structure. Two consequences, and the second is the serious one:

1. A customer reporting "it would not let me book" could not be matched to the lines their request produced. With several requests in flight the log is interleaved prose.
2. **The logs were leaking.** `console.error('failed:', obj)` prints whatever `obj` holds — booking payloads carry customer names, email addresses and phone numbers; user records carry password hashes and session tokens. Nobody had chosen to log those; they came along for the ride.

**Now:** one JSON object per line, `warn`/`error` to stderr, with a `requestId` assigned by middleware and echoed in the `x-request-id` response header. An id set upstream by nginx is reused rather than replaced, so the proxy and the application agree on one id per request.

Redaction is **by key, not by discipline** — anything matching password, token, secret, signature, authorization, cookie, api-key, credential, salt, otp or cvv becomes `[redacted]`, and personal data is reduced rather than dropped (`r***@example.com`, `***10`) so lines can still be correlated without identifying anyone. Depth, array length and string length are capped, so one log line cannot dump a query result onto the disk. 10 unit tests cover this, asserting by structure so a field added next year is covered without anyone editing the tests.

The middleware matcher was widened as part of this. The public booking flow had been excluded from it, which bought no protection — nothing outside `PROTECTED_PREFIXES` was ever gated — while leaving the most exposed code in the product as the one part with no id to trace by.

**Coverage.** Every server-side call site is converted — 60 of them across the web app, the notification dispatcher, the auth package and the scheduled jobs. The exceptions are deliberate and listed in DEPLOYMENT.md: two interactive CLIs, the E2E fixtures, and the `.tsx` client components, which log in the viewer's own browser where there is no shared stream.

The logger lives in `@bookings/core` rather than the web app, because every other package depends on core and core depends on none of them. It reaches `process` through `globalThis` instead of importing it, so core stays platform-neutral — it is bundled into client components, and forcing Node types into it would either break that or push `@types/node` onto every consumer.

**One honest gap:** `requestId` is attached on the public booking path, where a failure is most likely to be reported by a customer. Dashboard server actions get structure and redaction but not yet the id, because binding it there means threading an `await` through call sites that are not all async. Worth finishing; not finished.

**Still missing:** metrics, tracing, and any alerting. The logs are now worth reading, but nothing reads them. An exception in production still reaches a human only via a customer complaint, and that is the top remaining recommendation below.

---

## Performance

**One fixed, two left alone deliberately.**

**Fixed — the N+1 in `loadSchedules`.** It issued four queries _per candidate staff member_, in a sequential `for` loop: 4 queries for one staff member, 40 for ten. This runs on every slot listing, every booking creation and every reschedule — the hottest path in the product — and the candidate set grows with collective-booking and resource pools, exactly the feature most recently added. It is now four queries for the whole set, with the rows grouped by staff id in memory. The candidate order is preserved, because the routing strategy depends on it.

This was worth doing where the other two were not: it is on the request path rather than an admin action, it grows with a feature actively being built on, and the change is behaviour-preserving in a way tests can confirm — which they now do, including against the grouping mistake the refactor could plausibly have introduced.

**Left alone:**

- Several dashboard lists load every row for the workspace with no pagination. Fine at current volume; not fine at 10,000 customers.
- Data export builds the whole workbook plus a base64 copy in memory in one server action, capped at 50,000 rows.

Both are admin-facing, bounded in practice today, and would be guesswork to tune without production profiling.

---

## Production Readiness

### Completed

- Unauthenticated tenant-creation surface closed and verified live in production
- Application running as a least-privilege database role, verified unable to `DROP` or `COPY TO PROGRAM`
- Four security fixes deployed; PRs #53–#59 merged and live
- Test suite from 193 effectively-running to 429, including the first E2E tests in the project
- Eight documentation files reflecting the implementation as it actually is

### Written and verified, but not yet merged or deployed

Nothing in PR #60 is in production yet — it is open awaiting review. That covers the health and readiness endpoints, server-side image validation, and the availability N+1. All of it is verified locally against all four suites; none of it has run under production traffic. Treat the Security and Performance sections above as describing the repository, not the running deployment, until that lands.

### Fixed outside the repository

**The production disk**, which had been 7.8 GB at 75–92% and was silently truncating deploys. Resized to **16 GB on 2026-09-21** — now 38%, 9.4 GB free, with the containers running throughout. The diagnosis is worth keeping: the first resize attempt appeared to succeed but never reached this guest, and `pct config 110` still read `size=8G`. Confirm a resize from inside the container with `df -h /`, not from the console that accepted the change.

### Remaining — blocked outside the repository

**CI/CD is not running.** The GitHub Actions account is over its billing limit. Nothing verifies a push; every deploy is manual. **This is the single largest risk in the project**, it is now the only item in this category, and no change inside the repository can fix it.

### Recommended next

1. Restore CI — everything else in this report decays without it
2. Decide what `apps/api` is for: authenticate it or delete it
3. Error tracking (Sentry or equivalent); request-scoped structured logging now exists, but nothing alerts on a production exception
4. Verify backups exist and that a restore has been tested
5. Row-level security, as a second wall behind application-level tenant isolation
6. `pct fstrim 110` as routine housekeeping — the thin pool holds blocks the container has freed

### Known limitations

No horizontal scaling story, no job queue beyond the worker's sweep, no metrics or tracing, nothing alerting on the logs now being produced, no load testing of any kind, and no pagination on dashboard lists.

---

## Honest notes

**I caused one outage.** Switching the database role took `/book` down for a few minutes. My verification had passed because `psql` inside the container uses a unix socket with trust auth and never checked the password; Prisma connects over TCP, which does. Corrected, then re-verified over the real path including a deliberate wrong-password test. The lesson is recorded in DEPLOYMENT.md and PRODUCTION_CHECKLIST.md.

**Two findings were not fixed by choice**, both recorded above with reasoning rather than quietly skipped.

**"Production-ready" is not a state this reaches while CI is down.** The code is materially more defensible than it was; the process around it is not, and that gap is the honest headline.
