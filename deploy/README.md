# Production deploy

**Deploys are manual for now (since 2026-09-25).** `.github/workflows/deploy.yml`
builds the `web`, `migrate`, `worker` and `api` images and pushes them to GHCR
(`ghcr.io/rooman-itsd/rooman-bookings-*`) — but the workflow itself is
switched off at the GitHub Actions level (Actions tab → Deploy → "..." →
Enable workflow; or `PUT /repos/:owner/:repo/actions/workflows/deploy.yml/enable`).
While it's off, **neither** its automatic trigger (CI passing on `main`) nor a
manual `workflow_dispatch` run will do anything — a disabled workflow does not
run at all, by any trigger, until re-enabled.

This was done deliberately, not left over: CI had been billing-blocked for
days, so this trigger never actually fired regardless of what merged to
`main`. Now that CI works again, the first merge afterward would have
auto-built and pushed images, which the host's poller — already running, on
its own timer, entirely independent of GitHub — would then have auto-deployed
within about 2 minutes. No review step in between. Disabling the workflow
(rather than editing its trigger) was the fix that didn't need a token with
the `workflow` OAuth scope, which the one available here doesn't have.

**To actually deploy right now:** build and push the four images locally and
tag them, the same way every deploy has been done throughout this project
while CI was down. The host-side pull-and-restart below is unaffected either
way — that part was never gated on this workflow.

## One-time host setup

On the production host, as root:

```sh
# Auth to pull the (private) images. A classic PAT with read:packages,
# from whichever account has access to this repo.
docker login ghcr.io -u <github-username>

# Install the poller.
mkdir -p /opt/rooman-bookings/deploy
cp deploy-poll.sh /opt/rooman-bookings/deploy/deploy-poll.sh
chmod +x /opt/rooman-bookings/deploy/deploy-poll.sh
cp rooman-deploy-poll.service rooman-deploy-poll.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now rooman-deploy-poll.timer
```

`GHCR_IMAGE_PREFIX` must already be set in `/opt/rooman-bookings/.env`
(`ghcr.io/rooman-itsd/rooman-bookings`) — `docker-compose.prod.yml`'s
`image:` fields read it from there.

## Checking it

```sh
systemctl status rooman-deploy-poll.timer   # next/last run times
journalctl -u rooman-deploy-poll.service -f # watch the next poll happen
```

Once a deploy is triggered by hand and finishes pushing to GHCR, the change
should be live on the host within about 2 minutes — that part is still fully
automatic; only the "should a deploy happen at all" decision became manual.
