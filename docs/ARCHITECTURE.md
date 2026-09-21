# Architecture

## Shape

A Turborepo monorepo deployed as four containers behind nginx.

```
                    nginx (separate host)
                            │
                            ▼
          ┌─────────────────────────────────┐
          │  web        Next.js 16           │  the entire product
          │  worker     Node, long-lived     │  due reminders
          │  migrate    runs once, exits     │  prisma migrate deploy
          │  api        FastAPI  (unused)    │  see "Dead weight"
          └─────────────────────────────────┘
                     │              │
                PostgreSQL 16    Redis 7
```

| Workspace                    | What it is                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/web`                   | The product. Dashboard and public booking pages. Next.js App Router, server actions, no REST layer. |
| `apps/worker`                | Long-lived process sweeping due reminders and follow-ups every minute.                              |
| `apps/api`                   | A FastAPI re-implementation of booking and auth. **Nothing calls it.**                              |
| `packages/core`              | Pure domain logic: slot generation, timezone maths, password hashing. No I/O.                       |
| `packages/database`          | Prisma schema, migrations, the shared client.                                                       |
| `packages/auth`              | Sessions, tokens, password reset, the role hierarchy.                                               |
| `packages/notifications`     | Email, SMS and webhook channels; template rendering; the dispatcher.                                |
| `packages/ui`                | Shared components.                                                                                  |
| `packages/features/services` | The one area built as layered domain code — entity, use cases, repository, mapper.                  |

## Key decisions

**Server actions, not a REST API.** There is exactly one `route.ts` in the application (`/health`, read-only). Every mutation is a server action, which is why there is no bespoke CSRF scheme — Next's origin check covers them — and why "the API surface" is not a meaningful attack surface to enumerate separately.

**Scheduling correctness lives in PostgreSQL, not in application code.** Three `EXCLUDE USING gist` constraints, not check-then-insert:

| Constraint                                | Prevents                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| `bookings_no_staff_overlap`               | One staff member, two overlapping bookings. Exempts group-service rows.  |
| `bookings_no_cross_service_staff_overlap` | A group class overlapping a different service for the same staff member. |
| `booking_participants_no_staff_overlap`   | Two collective bookings claiming the same panelist.                      |

This is the single most important architectural decision in the codebase. An application-level availability check cannot stop two concurrent requests from both passing it; only a constraint can. Everything else about booking is arranged around keeping those constraints meaningful.

**Group capacity is the deliberate exception.** A group service is several customers sharing one slot, which is exactly what the first constraint otherwise prevents — so those rows are exempted from it and capacity is enforced in application code instead, via `pg_advisory_xact_lock` on `(staffId, serviceId)` followed by a count-then-insert inside one transaction (`apps/web/lib/booking-capacity.ts`). PostgreSQL cannot express "at most N rows sharing this slot" as a constraint, so this is a considered trade, not an oversight. It is the reason that file has the concurrency tests it does.

**Timezones: store UTC, resolve at the edges.** Every timestamp is `timestamptz`. A workspace carries an IANA timezone, a staff member may override it, and the customer's own timezone is recorded on the booking so confirmations read correctly on both sides. Slot generation converts once, at the boundary, using `date-fns-tz`.

**A layered domain model in one place only.** `packages/features/services` has entities, value objects, use cases and a repository interface. Nothing else does. That inconsistency is real; the pragmatic read is that the layering earned its keep for services (rich validation around duration, pricing, buffers) and would be ceremony elsewhere.

## Request path

```
Browser
  → middleware        session cookie present? else redirect to /login
  → page (RSC)        reads via Prisma, already workspace-scoped
  → server action     requireWorkspace(workspaceId, minRole)
                      → query scoped by workspaceId
                      → write, guarded by the DB constraints above
                      → dispatchBookingNotifications (failures logged, never rolled back)
```

Notification failures never roll back a booking. A committed appointment that failed to send an email is a support ticket; a rolled-back appointment because a mail server was unreachable is a lost customer.

## Dead weight

`apps/api` is a parallel Python implementation of slot generation, auth and booking creation, sharing the same database and the same session table. Nothing in the product calls it. Its public route was removed (PR #53) because `POST /auth/register` created a workspace with an OWNER membership and minted a dashboard session, unauthenticated.

It still builds, still has 56 pytest tests, and still runs as a container. Either give it a purpose and put authentication in front of it, or delete it — leaving a second, unexercised implementation of the auth and booking logic in the tree is how the two drift apart silently.

## Deployment

Images are built and pushed to GHCR; a systemd timer on the production host polls every two minutes and pulls what changed. GitHub cannot reach the host — it is on a private LAN — so the host pulls rather than being pushed to. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Known constraints

- **No horizontal scaling story.** Redis-backed rate limiting is shared, but the worker assumes it is the only sweeper (deliveries are claimed through a unique index, so a second one is safe, but nothing coordinates them).
- **No background job queue.** Notifications are dispatched inline and swept by the worker; there is no retry backoff beyond the sweep's own.
- **No observability beyond stdout.** No structured logging, request ids or tracing.
