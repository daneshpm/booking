# API

## There is no REST API

This is the first thing to understand about this codebase, because it is unusual and it changes what "the API surface" means.

Every mutation is a **Next.js server action** — a function exported from a `'use server'` module, invoked by the browser through Next's own RPC transport. There is exactly one HTTP route handler in the application (`/health`), and it is a read-only `GET`.

Consequences:

- **No endpoint list to enumerate.** Server actions are addressed by an opaque compiler-generated id, not a URL you can guess.
- **No bespoke CSRF scheme.** Server actions carry Next's origin check.
- **No API versioning, no OpenAPI spec.** There is no external contract, because there is no external consumer.
- **The browser is not the only caller.** A server action is still a public HTTP endpoint. Anything the client does before calling one — validation, size limits, disabled buttons — is a convenience, not a control. Every action re-validates and re-authorises server-side.

If you need an API for a mobile app or a third party, that is new work. Do not expose `apps/api` for it (see below) without putting authentication in front first.

## Public HTTP surface

| Path                                   | Auth       | Purpose                                         |
| -------------------------------------- | ---------- | ----------------------------------------------- |
| `/health`                              | none       | Liveness. `{"status":"ok"}`                     |
| `/health?ready=1`                      | none       | Readiness, checks the database. `200` / `503`   |
| `/book/[slug]`                         | none       | A workspace's public booking page               |
| `/book/[slug]/[serviceSlug]`           | none       | The booking funnel for one service              |
| `/book/manage/[token]`                 | bearer-ish | Customer self-service, gated by an opaque token |
| `/claim-spot`                          | token      | Waitlist claim                                  |
| `/accept-invite`                       | token      | Teammate invitation                             |
| `/login`, `/signup`, `/reset-password` | none       | Auth pages                                      |
| everything else                        | session    | Dashboard, gated by middleware                  |

## Server actions

Grouped by module. All dashboard actions call `requireWorkspace(workspaceId, minRole)` first; the minimum role is given where it is above `STAFF`.

### Public booking — `app/book/actions.ts`

Unauthenticated, rate-limited, and the most exposed code in the product.

| Action                                                                             | Notes                                                                       |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `getAvailableSlotsAction`                                                          | 120/min. Returns slots plus `remainingCapacity` for group services          |
| `createPublicBookingAction`                                                        | 10/hr. Capacity and collective-participant aware; idempotency key supported |
| `getBookingByManageTokenAction`                                                    | 30/15min                                                                    |
| `rescheduleBookingByManageTokenAction`                                             | Refuses collective bookings — those need the business                       |
| `cancelBookingByManageTokenAction`                                                 | Cancels participant rows too                                                |
| `verifyAndConfirmPaymentAction`                                                    | 20/hr. Guarded on the booking still being `PENDING`                         |
| `joinWaitlistAction`, `getClaimSpotDetailsAction`, `claimPublicWaitlistSpotAction` | 10/hr                                                                       |

### Dashboard

| Module                                                    | Actions                                                      | Minimum role                                  |
| --------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| `appointments/actions.ts`                                 | create, status, fast-pass walk-in, waitlist management       | `STAFF`                                       |
| `calendar/actions.ts`                                     | status, reschedule                                           | `STAFF`                                       |
| `staff/actions.ts`                                        | CRUD, working hours, overrides, breaks                       | `ADMIN`                                       |
| `services` (feature package)                              | CRUD, staff assignment                                       | `ADMIN`                                       |
| `settings/actions.ts`                                     | workspace settings, profile, password, sessions, invitations | `ADMIN`; invitations and role changes `OWNER` |
| `export/actions.ts`                                       | CSV/XLSX export                                              | `ADMIN`                                       |
| `analytics`, `booking-pages`, `workflows`, `availability` | reads and configuration                                      | `ADMIN`                                       |

### Auth — `app/signup/actions.ts`, `app/reset-password/actions.ts`, `app/accept-invite/actions.ts`

`signupAction`, `loginAction`, `logoutAction`, `changePasswordAction`, `requestPasswordResetAction`, `confirmPasswordResetAction`, `checkInvitationAction`, `acceptInvitationAsNewUserAction`, `acceptInvitationForExistingUserAction`.

## Conventions

**Results, not exceptions.** Actions return `{ success: false, error }` rather than throwing, so the client can render a message. Authorisation failures may throw `AuthorizationError` and are converted by `toActionError`.

**Errors are safe to display.** `safeErrorMessage` replaces anything mentioning Prisma, SQL, constraints or internal paths with a generic message, so a database error never reaches a browser naming a table.

**Neutral replies where the answer itself is information.** Password reset returns the same message and takes comparable time whether or not the address is registered.

## The FastAPI service

`apps/api` exposes `/api/auth/register`, `/api/auth/login`, `/api/auth/me`, `/api/bookings`, `/api/services`, `/api/availability`, and shares this application's database _and session table_.

**It is not part of the product and is not routed publicly.** The `/api/py/*` proxy that exposed it was removed, because `POST /auth/register` created a workspace with an OWNER membership and minted a dashboard session without authentication.

Do not treat it as the API. See [ARCHITECTURE.md](./ARCHITECTURE.md#dead-weight).

## Webhooks

**Outbound only.** Workflows can POST a booking payload to a configured URL, signed with `WEBHOOK_SIGNING_SECRET`.

There is **no inbound webhook route** — payment confirmation is pull-based: the browser reports back and the server independently re-fetches the order from the gateway. That is why a forged callback cannot mark a booking paid.
