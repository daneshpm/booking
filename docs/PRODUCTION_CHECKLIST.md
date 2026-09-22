# Production Checklist

Two lists: what to verify before a release, and what is still outstanding for this deployment.

## Before a release

Because CI is not currently running, every one of these has to be done by hand. See [TESTING.md](./TESTING.md) for the commands.

### Verify

- [ ] `npx turbo run lint` — typecheck passes
- [ ] `npx vitest run` — unit suite (246)
- [ ] Integration is intermittently red (~1 run in 3) from shared-database contention, not application faults — re-run once before investigating, and treat the _same_ test failing twice as real
- [ ] `npm run test:integration` — needs a disposable database; this is the one most often skipped and it covers the double-booking and tenant-isolation guarantees
- [ ] `npm run test:e2e` — needs a build first
- [ ] `cd apps/api && .venv/Scripts/python -m pytest tests/ -q` — if `apps/api` changed. Use the venv, not the system interpreter: the system one here has a FastAPI far older than `requirements.txt` allows and collection fails before any test runs
- [ ] `npm run format:check`
- [ ] No new `console.log` / `console.error` in server-side code — use `logger` from `@bookings/core`. `console` bypasses redaction, which is how password hashes and customer phone numbers previously reached the logs
- [ ] `npm run build` — a real production build, not just a typecheck

### If the schema changed

- [ ] Migration applies to an **empty** database, not just to yours
- [ ] Migration is additive, or the destructive step is deliberate and noted in the PR
- [ ] The three exclusion constraints still exist afterwards — `group-capacity.spec.ts` asserts this
- [ ] `prisma migrate deploy` is what runs in production; never `db push`

### If anything `NEXT_PUBLIC_*` changed

- [ ] Passed as a **build argument**, not an environment variable. It is inlined at build time; setting it at runtime does nothing. This has already caused one outage.

### Deploy

- [ ] Check free disk on the host first — a deploy on a full disk fails silently partway
- [ ] Images pushed to GHCR
- [ ] Poller picked them up, or run it by hand
- [ ] `/health` and `/health?ready=1` both answer
- [ ] `/login` and a real tenant booking page both render
- [ ] Container logs show no `authentication failed`, `permission denied` or `prisma:error`

## Outstanding for this deployment

### Blocking anything resembling a real release process

**CI is not running.** The GitHub Actions account is over its billing limit, so nothing verifies a push and no images are published automatically. Every deploy is manual and every check above is on the honour system. This is the single largest risk in the project and it cannot be fixed from inside the repository.

It is now the _only_ item in this category.

### Resolved

**The production disk.** Was 7.8 GB at 75–92%, which silently truncated deploys. Resized to 16 GB on 2026-09-21 — now 38%, 9.4 GB free, done with the containers running. See [DEPLOYMENT.md](./DEPLOYMENT.md#the-disk) for the procedure and what to check before repeating it.

### Worth doing

- **Decide what `apps/api` is for.** It is a second, unexercised implementation of auth and booking sharing this database. Give it a purpose and authentication, or delete it.
- **No error tracking.** No Sentry or equivalent. The logs are structured and carry request ids now, but nothing reads them — nobody learns about a production exception unless a customer complains. This is the biggest remaining gap after CI.
- **No metrics or tracing.** No request rates, latencies or error rates over time.
- **No backups verified.** PostgreSQL runs in a container with a volume. Whether it is backed up, and whether a restore has ever been tested, is unknown — untested backups are not backups.
- **Pagination — deliberately deferred, with numbers.** 26 of 28 dashboard `findMany` calls specify no `take:`. Measured against production on 2026-09-22: 55 bookings in total, and the **largest single workspace holds 11**; 41 customers, 24 staff, 23 services across 17 workspaces. An unbounded list returning 11 rows does not need pagination, and adding it now would be speculative complexity. Revisit when any single workspace passes a few thousand rows. The data export is already bounded at 50,000 rows and warns when it truncates.
- **Row-level security.** Tenant isolation is enforced in application queries only.

### Accepted, not forgotten

- Signup reveals whether an email is registered — see [SECURITY.md](./SECURITY.md#accepted-risks)
- Rate limiting is bypassable from the LAN
- Six transitive npm advisories, all unreachable; `--force` would break the build

## Incident notes

Things that have actually gone wrong here, worth reading before touching the same areas:

**Invitation links pointed at `localhost:3000`.** `NEXT_PUBLIC_APP_URL` is inlined at build time; the Dockerfile never passed it. Changing production `.env` did nothing. Fixed by making it a build argument.

**`/book` went down during a database role change.** The new role's password was verified with `psql` _inside_ the container, which uses a unix socket with trust auth and never checks the password at all. Prisma connects over TCP, which does. Always verify a database credential over the path the application actually uses, and prove the check is real by trying a deliberately wrong password.

**Deploys silently doing nothing.** The poller pulls images one at a time and aborts on the first failure — before the cutover step. A disk-full failure on the last image means the earlier ones are pulled but never applied, and the deploy appears to have run.
