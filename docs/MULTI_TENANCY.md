# Multi-Tenancy

> Isolation between tenants and privilege escalation inside one tenant are different questions. Both are now tested against the real server actions — `cross-tenant-actions.spec.ts` (17) and `role-escalation.spec.ts` (14). See [TESTING.md](./TESTING.md).

How one deployment serves several independent businesses without leaking between them.

## Strategy

**Shared database, shared schema.** One PostgreSQL database, one set of tables, and a `workspace_id` column on every tenant-owned row.

This was the right call for this deployment and would be the wrong call for some others, so the reasoning matters: a database per tenant would multiply migration and backup work by the tenant count, and a schema per tenant would break Prisma's single generated client. The cost is that isolation becomes a property of the queries rather than of the connection — get a query wrong and there is no second wall behind it. That cost is paid down with the guard below and the tests in `apps/web/test/integration/cross-tenant-actions.spec.ts`.

## The tenant

`Workspace` is the tenant. Everything a business owns hangs off it:

```
Workspace
├── WorkspaceMember  → User (with a Role)
├── Staff            → StaffWorkingHours, StaffBreak, StaffOverride
├── Service          → ServiceStaff, ServiceCategory
├── Customer
├── Booking          → BookingParticipant, BookingAuditLog, NotificationLog
├── WaitlistEntry
├── Workflow
├── BookingPage, RoutingForm
└── Invitation
```

A `User` is a login and is **not** tenant-owned — the same person can be a member of several workspaces. This is why authorisation is `WorkspaceMember`, not a column on `User`.

## Roles

| Role           | Rank | Intended for                                                       |
| -------------- | ---- | ------------------------------------------------------------------ |
| `OWNER`        | 40   | The person who created the workspace. Can grant roles and invite.  |
| `ADMIN`        | 30   | Runs the business day to day: services, staff, analytics, exports. |
| `STAFF`        | 20   | Sees and manages appointments.                                     |
| `RECEPTIONIST` | 10   | Front desk: books and reschedules.                                 |

Ranks are numeric so a check reads as "at least this much authority" rather than an enumeration that has to be updated every time a role is added.

## How isolation is enforced

Every request follows the same path:

```
Request
  → session cookie (rb_session, SHA-256 hashed at rest)
  → resolveSession()      reads the user and their memberships, live from the database
  → requireWorkspace(id, minRole)
        · is the caller signed in?
        · are they a member of *this* workspace?
        · does their role meet the minimum?
  → the query, scoped by workspaceId
```

`requireWorkspace` lives in `apps/web/lib/session.ts`. Two rules make it work, and both are load-bearing:

**1. Never trust a client-supplied id.** `workspaceId` arrives from the browser on most server actions. It is a claim, not a fact, until `requireWorkspace` has checked it against the caller's memberships.

**2. Re-scope the id in the query, not just in the guard.** This is the subtle one. Passing the guard proves the caller belongs to workspace A. It proves nothing about the `bookingId` they also sent. So:

```ts
// Wrong — the guard passed, but this booking could belong to anyone
await requireWorkspace(workspaceId, 'STAFF');
const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

// Right — the row cannot resolve outside the caller's workspace
await requireWorkspace(workspaceId, 'STAFF');
const booking = await prisma.booking.findFirst({ where: { id: bookingId, workspaceId } });
```

Where an action takes only a resource id and no `workspaceId` (the calendar and appointments status actions, for instance), it loads the row first, reads the `workspaceId` off it, and calls the guard with that — so the check is still against the row's real owner.

Memberships are re-read from the database on every request rather than carried in the session, which is why removing someone or changing their role takes effect on their next request with no session rotation.

## What is deliberately not tenant-scoped

- `User` — a login can belong to several workspaces.
- `Session` — belongs to a user, not a workspace.
- `PasswordResetToken` — likewise.
- The public booking flow resolves the workspace **from the URL slug**, not from a session, because the customer has no account. Everything downstream is then scoped to that resolved workspace.

## The one deliberate exception

`User.isPlatformAdmin` and the `/super-admin` dashboard it gates read across every workspace at once — every other server action in the codebase scopes its query to the single workspace `requireWorkspace` resolves. This exists so a platform operator can see how many organizations exist and how active each is, without needing a membership in any of them.

It is a single boolean on the account, not a role, and nothing in the ordinary signup, invite, or role-management flows can ever set it — see the comment on the field in `schema.prisma`. It is granted by direct database action only: `npm run db:seed-platform-admin`, which never overwrites an existing account's password, only adds the flag. `requirePlatformAdmin()` (`packages/auth/src/next.ts`) is a separate function from `requireWorkspace`, deliberately not a variant of it, so a bug in one cannot silently widen the other.

A platform admin holds no workspace membership at all, which is why it needed its own path through login (`loginUserAction` in `apps/web/app/signup/actions.ts` refuses login for a zero-membership account, unless `isPlatformAdmin` is set) and its own `NO_WORKSPACE` handling in `requireWorkspace` itself (redirect to `/super-admin` instead of the login dead-end everyone else hits).

### Organization lifecycle: soft delete and billing status

A platform admin can deactivate an organization (`setOrganizationActiveAction` in `apps/web/app/super-admin/actions.ts`) rather than delete it. `Workspace.isActive` is a soft-delete flag, not a hard delete — every `onDelete: Cascade` relation on `Workspace` means a real delete would wipe every booking, customer and staff record with it, so deactivation is the only destructive-looking action exposed. Turning it off does exactly one thing at the data layer: `resolveSession()` (`packages/auth/src/session.ts`) filters the workspace out of `session.workspaces` when building the session, so `requireWorkspace` sees it as `NO_WORKSPACE` — a code path that already existed and is already tested, not a new one. The public booking page and the two internal `workspace.findUnique` lookups in `apps/web/app/book/actions.ts` additionally check `isActive` directly, since those requests never go through `requireWorkspace` at all.

Billing status (`Workspace.billingStatus`, `TRIAL | SUBSCRIBED`) is a manual toggle, not a real subscription state — there is no payment processor wired up for organization-level billing, so a platform admin flips it by hand once payment happens through whatever real-world process is actually used (`updateBillingStatusAction`). A new workspace starts on `TRIAL` with a `trialEndsAt` date; marking it `SUBSCRIBED` clears that date rather than leaving a stale one behind.

## Verification

Isolation is asserted in two places, and the distinction matters:

- `test/integration/tenant-isolation.spec.ts` — the guard itself rejects a foreign workspace id.
- `test/integration/cross-tenant-actions.spec.ts` — **the real server actions** refuse a foreign resource, covering both attack shapes (foreign `workspaceId`, and own `workspaceId` with a foreign resource id). Includes positive controls proving the same calls succeed on the caller's own resources, so a refusal cannot pass for the wrong reason.
- `test/integration/platform-admin.spec.ts` — the mirror image of the above: proves an ordinary workspace owner, even the owner of one of several seeded tenants, is refused the cross-tenant view, and that a genuine platform admin sees real data (not a placeholder) for every one of them.
- `test/integration/organization-lifecycle.spec.ts` — deactivation and the billing toggle both refuse a non-admin caller; deactivation removes the workspace from its owner's session without touching its rows, and restores it on reactivation; `public-booking.spec.ts` covers the same deactivated-workspace refusal at the two internal booking call sites.

The second and third exist because the first is not sufficient: the guarantee in practice depends on every author remembering to call the guard _and_ scope the query, and only a test at the call site can see that.

## Known limitation

There is no database-level enforcement — no row-level security policies. A query that forgets its `workspaceId` filter will return another tenant's rows and nothing below the application will stop it. RLS would be the belt to this braces, and is the obvious next hardening step if the tenant count or the team size grows.
