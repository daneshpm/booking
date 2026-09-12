# Production deploy

`.github/workflows/deploy.yml` builds the `web`, `migrate`, `worker` and
`api` images and pushes them to GHCR (`ghcr.io/rooman-itsd/rooman-bookings-*`)
whenever CI passes on `main`. It stops there: the production host sits on a
private LAN address with no route in from GitHub's hosted runners, and
registering a self-hosted runner needs repo admin rights this project's
collaborators don't have. So instead of GitHub pushing a deploy, the host
pulls one.

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

A merge to `main` should be live within about 2 minutes of CI finishing.
