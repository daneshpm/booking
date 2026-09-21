# Deployment

## Topology

```
                    Internet
                       │
                       ▼
        nginx  ·  192.168.1.52  ·  TLS, booking.futureacad.ae
                       │  (LAN)
                       ▼
        Proxmox LXC 110  ·  192.168.1.162  ·  16 GB disk
        ┌──────────────────────────────────────────┐
        │  web      :3000                           │
        │  worker                                   │
        │  api      (unused)                        │
        │  postgres · redis                         │
        │  systemd timer: rooman-deploy-poll        │
        └──────────────────────────────────────────┘
```

nginx runs on a **different, shared host** that also serves unrelated services. Treat its configuration as out of bounds unless you know what else depends on it.

## How a deploy reaches production

GitHub cannot reach the production host — it is a private LAN address with no route in. So the host pulls rather than being pushed to:

```
merge to main
  → CI (.github/workflows/ci.yml)
  → Deploy (.github/workflows/deploy.yml) builds and pushes 4 images to GHCR
  → systemd timer on the host, every 2 minutes:
        deploy/deploy-poll.sh
          pull each image (api, web, migrate, worker), one at a time
          docker compose up migrate --exit-code-from migrate
          docker compose up -d
```

Migrations run to completion **before** the new web image is cut over, and a failed migration aborts the script leaving the previous images serving.

### CI is currently not running

The GitHub Actions account is over its billing limit, so `deploy.yml` never fires and **no images are published automatically**. Until that is resolved, deploys are manual:

```bash
# from a clean checkout of main
docker build --build-arg NEXT_PUBLIC_APP_URL=https://booking.futureacad.ae \
  --target runner -f apps/web/Dockerfile \
  -t ghcr.io/rooman-itsd/rooman-bookings-web:latest .

docker push ghcr.io/rooman-itsd/rooman-bookings-web:latest
# the host's poller picks it up within ~2 minutes
```

Rebuild `migrate` and `worker` too if `packages/` or the schema changed; `api` only if `apps/api` changed.

## `NEXT_PUBLIC_*` must be build arguments

`next build` **inlines** `NEXT_PUBLIC_*` values into the compiled output. Setting one at container start does nothing — the value was fixed when the image was built.

This caused a real outage of the invitation flow: every invite email linked to `localhost:3000` regardless of what production's `.env` said, because the Dockerfile never passed the variable into the build. `apps/web/Dockerfile` now takes it as an `ARG`, and `deploy.yml` passes it for the `web` and `migrate` images.

If invitation links, password-reset links or calendar URLs ever point somewhere wrong, this is the first thing to check — and the fix is a **rebuild**, not an environment change.

## Database roles

Two connection strings, deliberately:

| Service                | Role                   | Why                                            |
| ---------------------- | ---------------------- | ---------------------------------------------- |
| `migrate`              | `postgres` (superuser) | Creates and alters objects                     |
| `web`, `worker`, `api` | `bookings_app`         | Rows only — no DDL, no ownership, no superuser |

`APP_DATABASE_URL` in `/opt/rooman-bookings/.env` carries the restricted URL and falls back to the superuser URL if unset, so an environment that has not run `deploy/least-privilege-role.sql` still starts.

To create the role on a new environment:

```bash
docker cp deploy/least-privilege-role.sql <postgres-container>:/tmp/
docker exec <postgres-container> psql -U postgres -d bookings_prod \
  -v app_password="'<a-strong-password>'" -f /tmp/least-privilege-role.sql
```

**Verify over TCP, not from inside the container.** `psql -U bookings_app` on a unix socket uses trust auth and never checks the password — which has already produced one false confirmation and a short outage. Verify the way the application connects:

```bash
docker exec <postgres-container> \
  psql "postgresql://bookings_app:<password>@postgres:5432/bookings_prod" -c 'select 1'
```

## The disk

**Resized to 16 GB on 2026-09-21** (`pct resize 110 rootfs +8G` on the Proxmox node `rooman`), from 7.8 GB. It now sits at **38% — 9.4 GB free**, where it had been running at 75–92%. The container stayed up throughout; `pct resize` extends the volume and runs `resize2fs` online.

This had been the most common cause of a failed deploy, and the rest of this section is the workaround that is no longer needed day to day — kept because the failure mode is worth recognising if space ever gets tight again.

The failure mode: the poller pulls images one at a time, largest last. If `worker` runs out of space, the script aborts **before** the cutover step, so images that pulled successfully are never applied — the deploy silently does nothing while appearing to have run.

Recovery:

```bash
cd /opt/rooman-bookings
docker compose -f docker-compose.prod.yml up migrate --no-build --exit-code-from migrate
docker compose -f docker-compose.prod.yml up -d web api --no-build   # frees the old layers
docker image prune -f                                                 # never -af
docker compose -f docker-compose.prod.yml pull worker
docker compose -f docker-compose.prod.yml up -d worker --no-build
```

`docker image prune -f` removes only dangling layers. **Never `-af`** — that deletes images not currently backing a running container, including ones the poller has pulled but not yet cut over to.

### If it gets tight again

`pct resize 110 rootfs +8G` on the Proxmox node, after checking the thin pool has the space:

```bash
lvs pve        # the `data` pool's Data% — the container's own figure is not pool pressure
pct resize 110 rootfs +8G
pct fstrim 110 # returns blocks the container freed but the thin pool still holds
```

`fstrim` has to run from the host. Inside an unprivileged LXC it fails with `FITRIM ioctl failed: Operation not permitted`.

## Health checks

```
GET /health           → {"status":"ok"}      liveness, no dependencies touched
GET /health?ready=1   → {"status":"ready"}   readiness, checks the database
                      → 503 {"status":"unavailable"}
```

Point a load balancer at the plain `/health`. A liveness probe that touches the database will restart healthy containers during a database blip and turn a brief outage into a crash loop.

## Logs

One JSON object per line. `warn` and `error` go to stderr, everything else to stdout, so a shipper can split them without parsing.

```json
{
  "ts": "2026-09-21T10:25:52.877Z",
  "level": "error",
  "msg": "Error creating booking",
  "requestId": "9f2c…",
  "err": { "name": "Error", "message": "…" }
}
```

**`requestId` is the point of it.** Middleware assigns one per request, echoes it in the `x-request-id` response header, and reuses an id set upstream rather than issuing a second one — so nginx and the application agree. When someone reports a failed booking, get the id from their response headers and:

```bash
docker logs rooman-bookings-web-1 2>&1 | grep '"requestId":"9f2c'
```

`LOG_LEVEL` sets the threshold (`debug`, `info`, `warn`, `error`, or `silent`). Default `info`; tests default to silent so a deliberate error-path test does not print a stack trace that looks like a real failure.

**Values are redacted by key, not by remembering to.** Anything matching password, token, secret, signature, authorization, cookie, api-key, credential, salt, otp or cvv becomes `[redacted]`; emails become `r***@example.com` and phone numbers `***10`, which is enough to correlate two lines but not to identify a person. Depth, array length and string length are all capped, so one log line cannot dump a whole query result onto a 16 GB disk.

Use `logger` from `@bookings/core`, or `requestLogger()` from `lib/request-context` (web only) to bind the request id once. **Do not add `console.log` or `console.error`** — it bypasses redaction, which is how customer phone numbers and password hashes were previously reaching the logs.

The logger lives in `@bookings/core` because every other package depends on core and core depends on none of them, so the worker, the notification dispatcher and the auth package can all use it. It reaches `process` through `globalThis` rather than importing it, so the package stays platform-neutral and falls back to `console` in a browser bundle instead of breaking.

Every server-side call site is converted. The exceptions are deliberate: `packages/database/src/seed.ts` and `packages/notifications/src/cli.ts` are interactive CLIs whose output is meant for a person at a terminal, the E2E fixtures are test tooling, and the `.tsx` client components log in the browser, where there is no shared log stream and the data is the viewer's own.

## Rollback

Containers run `:latest`, so rollback means re-pushing a known-good image:

```bash
docker pull ghcr.io/rooman-itsd/rooman-bookings-web:<good-sha>
docker tag  ghcr.io/rooman-itsd/rooman-bookings-web:<good-sha> \
            ghcr.io/rooman-itsd/rooman-bookings-web:latest
docker push ghcr.io/rooman-itsd/rooman-bookings-web:latest
```

`deploy.yml` tags every image with the commit SHA as well as `latest`, so those tags exist for anything CI built. **Migrations do not roll back** — a deploy containing a destructive migration is not reversible this way.

Configuration changes are reverted from the timestamped backups the change process leaves beside `.env` and `docker-compose.prod.yml`.

## Access

SSH to `192.168.1.162` works **only from the LAN**. Off-network the public site is reachable over HTTPS but the host is not administrable — worth knowing before an incident rather than during one.
