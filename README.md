# Rooman Bookings

Multi-tenant appointment scheduling. A public booking page takes appointments;
an internal dashboard manages services, staff, schedules and automated
notifications.

Built as a Turborepo monorepo: a Next.js application, a FastAPI service sharing
its database and session store, and shared TypeScript packages.

---

## Quick start

**Requirements:** Node 20+, npm 10+, PostgreSQL 16+, and optionally Docker for
the local services.

```bash
# 1. Start PostgreSQL, Redis and a local mail sink
docker compose -f docker/docker-compose.yml up -d

# 2. Configure the environment
cp .env.example .env
#    Then edit .env and set ADMIN_EMAIL and ADMIN_PASSWORD.

# 3. Install and prepare the database
npm install
npm run db:generate
npm run db:migrate:deploy

# 4. Create the first account
npm run db:seed

# 5. Run
npm run dev
```

Sign in at http://localhost:3000/login with the credentials you set in `.env`.
Mail sent locally is captured at http://localhost:8025 and never leaves the
machine.

---

## Getting to a usable workspace

The seed creates one owner account, one workspace and one staff member. It does
not create sample services, customers or appointments: fixture rows that reach
production look exactly like real records and cannot be told apart from genuine
customer data later.

After signing in:

1. **Settings** — confirm the workspace name, timezone and currency. Every
   availability calculation happens in this timezone.
2. **Schedules** — set working hours and breaks for each staff member.
3. **Event Types** — create the services people can book, with durations and
   the buffers you want before and after each appointment.
4. **Booking Pages** — copy the public link, or the embed snippet, and share it.

Onboarding progress in the sidebar reflects what actually exists in the
workspace.

---

## Architecture

```
apps/
  web/          Next.js 15 App Router. Pages, server actions, middleware.
  api/          FastAPI service. Shares the database and session store.
packages/
  core/         Pure domain logic: time maths, password policy, Result type.
  auth/         Sessions, password hashing, workspace authorization.
  database/     Prisma schema, migrations, seed and maintenance scripts.
  ui/           Shared presentational components.
  features/
    services/   Service catalogue: domain, use cases, repository, components.
```

### Authentication

Sessions are server-side and revocable. A login issues a 32-byte random token;
only its SHA-256 digest is stored, so a database dump cannot be replayed. The
cookie is `httpOnly`, `sameSite=lax`, and `secure` in production.

Both services read the same `sessions` table, so a session issued by either is
honoured by both and revoking one takes effect everywhere immediately. A
stateless token could not do that.

Passwords are bcrypt at cost 12. The policy rejects anything longer than 72
bytes, because bcrypt ignores the remainder and two different long passwords
would otherwise open the same account.

### Tenant isolation

Every exported server action is a public HTTP endpoint once built. A workspace
id in an action's arguments is therefore attacker-controlled until proven
otherwise, so each action calls `requireWorkspace(workspaceId, role)`, which
confirms the signed-in user holds a membership on that workspace with at least
the required role.

Middleware redirecting anonymous visitors is a convenience, not the boundary:
it only checks that a cookie is present, because verification needs a database
round trip the Edge runtime cannot make. Pages and actions verify independently.

Roles are ordered `OWNER > ADMIN > STAFF > RECEPTIONIST`; a higher role
satisfies a lower requirement.

### Double-booking prevention

A PostgreSQL exclusion constraint makes two overlapping appointments for one
staff member impossible:

```sql
EXCLUDE USING gist (
  staff_id WITH =,
  tstzrange(start_time, end_time, '[)') WITH &&
) WHERE (status <> 'CANCELLED')
```

Application code checks availability first so the customer gets a useful
message, but that check cannot stop two concurrent requests from both passing
and both inserting. The constraint can. The range is half-open, so an
appointment may start exactly when the previous one ends.

### Availability

Slots are generated per staff member from their weekly working hours and
breaks, in the workspace timezone, with the service's buffers applied before
collision checks. Times are stored in UTC.

### Notifications

Booking confirmations and cancellations are sent automatically. Workflows add
reminders and follow-ups, and can target the customer, the staff member, or
both, with `{{placeholder}}` templates.

Every attempt is written to `notification_logs` with its outcome, so a delivery
failure is visible rather than silent. With `SMTP_HOST` unset, nothing is sent
and the dashboard says so.

---

## Commands

| Command                     | What it does                                      |
| --------------------------- | ------------------------------------------------- |
| `npm run dev`               | Start the development server                      |
| `npm run build`             | Production build                                  |
| `npm run typecheck`         | Typecheck every package                           |
| `npx vitest run`            | Unit tests                                        |
| `npm run format`            | Format with Prettier                              |
| `npm run db:migrate`        | Create and apply a migration in development       |
| `npm run db:migrate:deploy` | Apply pending migrations (use this in production) |
| `npm run db:seed`           | Create the first owner account                    |
| `npm run sessions:purge`    | Delete expired session rows                       |

Integration tests need a live database and run separately:

```bash
DATABASE_URL="postgresql://postgres:password123@localhost:5434/bookings_dev" \
  npx vitest run --config vitest.integration.config.mts
```

They truncate every table between tests, so point them at a disposable
database, never a database with real data in it.

### FastAPI service

```bash
cd apps/api
python -m venv .venv
# Windows: .venv\Scripts\activate   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Docs are at http://127.0.0.1:8000/docs in development and disabled in
production. The web app proxies `/api/py/*` to this service.

```bash
cd apps/api && pytest -q     # integration tests skip without DATABASE_URL
```

---

## Configuration

`.env.example` documents every variable. The ones that matter most:

| Variable                             | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `DATABASE_URL`                       | PostgreSQL connection, shared by both services         |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`      | Seed credentials; the seed refuses to run without them |
| `SMTP_HOST` and friends              | Email delivery; leave unset to disable sending         |
| `VIDEO_MEETING_BASE_URL`             | Base for generated meeting rooms                       |
| `NEXT_PUBLIC_DEFAULT_WORKSPACE_SLUG` | Workspace the landing page links to                    |
| `CORS_ORIGINS`                       | Browser origins allowed to call the FastAPI service    |

Generated video links point at a Jitsi room, which exists as soon as someone
opens it, so the link works with no API credentials. Set
`VIDEO_MEETING_BASE_URL` to a self-hosted instance for production.

---

## Deployment

Both services have multi-stage Dockerfiles that run as a non-root user with
health checks.

```bash
docker build -f apps/web/Dockerfile -t rooman-bookings-web .
docker build -f apps/api/Dockerfile -t rooman-bookings-api apps/api
```

Apply migrations before starting a new release:

```bash
npm run db:migrate:deploy
```

Set `NODE_ENV=production`, which enables secure cookies, HSTS, and disables the
API docs endpoints. Serve over HTTPS: session cookies are marked `secure` in
production and a browser will not send them over plain HTTP.

`npm run sessions:purge` deletes expired session rows; a scheduled workflow runs
it daily when a `DATABASE_URL` secret is configured.

---

## Continuous integration

Every pull request runs formatting, a typecheck of all packages, unit tests with
coverage, a production build, integration tests against a real PostgreSQL, the
Python lint and test suite, and a dependency audit.

A migration drift job fails the build when `schema.prisma` has changes no
migration covers, so a missing migration is caught before deployment rather than
as a runtime error afterwards. CI also asserts the booking overlap constraint
exists after migrations run, and that the seed rejects both missing and weak
administrator credentials.

Make **CI passed** the required status check in branch protection; it aggregates
every other job.

---

## Contributing

- Schema changes need a migration. Run `npm run db:migrate`.
- New server actions must call `requireWorkspace`. Without it the action is an
  unauthenticated endpoint that accepts any workspace id.
- Do not write sample data to the database.
- Document new environment variables in `.env.example`.

---

## About

Built for [Rooman Technologies](https://www.rooman.com), Bengaluru.
