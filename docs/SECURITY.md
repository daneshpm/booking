# Security

> **Request correlation ids are validated.** `x-request-id` arrives from the caller, is echoed in the response and is stamped onto every log line for that request. An unvalidated one was accepted verbatim at 3000 characters — cheap, unauthenticated log amplification. Upstream ids are now reused only when ≤128 characters and free of whitespace and control characters; anything else is replaced. See `packages/core/src/logging/request-id.ts`.

What protects this application, what deliberately does not, and where the edges are.

## Authentication

**Sessions, not JWTs.** A session is a row; a token is 32 random bytes, base64url-encoded, and **only its SHA-256 digest is stored**. The plaintext token exists in the cookie and nowhere else, so a database dump does not yield usable sessions.

| Property   | Value                                                                              |
| ---------- | ---------------------------------------------------------------------------------- |
| Cookie     | `rb_session` — `httpOnly`, `secure` in production, `sameSite=lax`, explicit expiry |
| Lifetime   | 7 days, absolute. No sliding renewal.                                              |
| Revocation | Immediate — every request re-reads the session and memberships from the database   |
| Storage    | SHA-256 digest only                                                                |

Because memberships are re-read per request, deactivating a user or changing their role takes effect on their **next request**. There is no token to wait out.

**Passwords** are bcrypt at cost 12. The policy is enforced server-side on all four paths that can set one — signup, change, reset, and invitation acceptance — and `hashPassword` throws if handed something that fails it, so no path can skip the check by construction. Bcrypt's 72-byte input limit is rejected rather than silently truncated, which would otherwise make two different long passwords equivalent.

**Password reset** tokens are single-use (claimed with a conditional `updateMany`), short-lived, and both reset and password change revoke every existing session transactionally.

## Authorization

See [MULTI_TENANCY.md](./MULTI_TENANCY.md). In short: `requireWorkspace(workspaceId, minRole)` on every dashboard server action, ids re-scoped inside the query, and role ranks compared numerically.

There are **no `route.ts` API handlers** other than `/health`, which is a read-only GET. Every mutation is a Next.js server action and inherits its origin check, which is why there is no separate CSRF token scheme.

**One account type sits outside that model entirely.** `User.isPlatformAdmin` grants read-only access to `/super-admin`, a cross-tenant list of every organization — the single query in the codebase that is not scoped to one workspace. It cannot be granted through signup, invites, or any role-management action; only `npm run db:seed-platform-admin`, run directly against the database, can set it, and that script never touches an existing account's password. See MULTI_TENANCY.md's "the one deliberate exception" for the full reasoning and its test coverage.

## Rate limiting

Redis-backed when `REDIS_URL` is set (shared across instances), falling back to a per-process counter with a hard key ceiling so that key rotation causes eviction rather than unbounded memory growth.

The caller is identified by the **rightmost** hop of `X-Forwarded-For` — the entry the proxy appended — not the leftmost, which the caller controls. See `apps/web/lib/rate-limit.ts` for why that is correct under either common nginx configuration.

| Endpoint                | Limit                                  |
| ----------------------- | -------------------------------------- |
| Public booking creation | 10 / hour                              |
| Availability lookup     | 120 / minute                           |
| Login                   | 10 / 15 min per IP **and** per account |
| Signup                  | 5 / hour                               |
| Password reset          | 5 / hour per IP, 3 / hour per address  |
| Manage-booking (token)  | 30 / 15 min                            |
| Payment verification    | 20 / hour                              |
| Waitlist claim          | 10 / hour                              |
| Invitation accept       | 20 / hour                              |

**This is a deterrent, not a control.** The web container publishes port 3000 on all interfaces, so anything already on the LAN can bypass the proxy and present any header it likes. Treat the limits as protection against ordinary abuse and scripted noise, not as an authentication boundary.

## Payments

Never trusted from the client. Both providers are verified server-side:

- **Razorpay** — HMAC-SHA256 over `orderId|paymentId`, compared with `timingSafeEqual` behind an explicit length check (the function throws on length mismatch rather than returning false).
- **Stripe** — the Checkout Session is **re-fetched from Stripe's API** and its `payment_status` inspected. A customer reaching the success URL proves nothing.

The provider and order id are re-derived from the booking row rather than taken from the request, and confirmation is guarded on the booking still being `PENDING`, so a replayed signature cannot resurrect a cancelled booking.

**Both fail closed in production**: with no gateway credentials configured, verification returns failure rather than confirming an unpaid booking. Outside production they auto-succeed so local development works.

Covered by `apps/web/test/payments.spec.ts`.

## Input handling

Zod validates every server action's input. Prisma parameterises every query it builds, so SQL injection is structurally prevented rather than filtered — `apps/web/test/integration/malicious-input.spec.ts` fires injection, XSS, traversal, template- and command-injection payloads at the public booking flow and asserts the schema survives intact.

**Images** (logos, avatars) are submitted as base64 data URLs and stored in text columns. `apps/web/lib/image-value.ts` validates them server-side: raster types only, size-capped, `preset:` references allowed. SVG is rejected because it is a document that can carry script, and remote URLs are rejected because they would beacon every viewer of the dashboard to a third-party server.

**Data export** escapes leading `=`, `+`, `-` and `@` so a customer-supplied name cannot become a formula when an admin opens the CSV.

## Response headers

Set in `next.config.mjs` and asserted in `apps/web/e2e/ops.spec.ts`: `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. `X-Powered-By` is suppressed.

## Database privileges

The application connects as `bookings_app`, which can read and write rows and nothing else. It cannot create, alter or drop objects, and it is **not** a superuser — which matters most because superuser carries `COPY ... FROM PROGRAM`, turning any SQL foothold into command execution on the database container.

Only the `migrate` container uses the superuser URL, because it creates objects. See `deploy/least-privilege-role.sql`.

## Accepted risks

Recorded deliberately rather than left to be rediscovered.

**Signup reveals whether an email is registered.** Removing that message degrades signup for every honest user, and any login form that distinguishes a wrong password leaks the same fact. Most mainstream products make the same trade. The _timing_ oracle on password reset was closed, because that cost nothing to close.

**Rate limiting is bypassable from the LAN.** Port 3000 is published on all interfaces because nginx runs on a different host. Fixing it properly means binding to the proxy's interface or moving the proxy onto the same host.

**Six transitive npm advisories.** All unreachable here — the loudest is a MySQL driver in a Postgres-only application. `npm audit fix --force` would downgrade Prisma 7 → 6 and break the application, so they are documented rather than "fixed".

**No row-level security.** Tenant isolation is enforced in application queries only. See MULTI_TENANCY.md.

## Reporting

Security issues should go to the repository owner directly rather than through a public issue.
