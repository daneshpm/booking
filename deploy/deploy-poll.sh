#!/bin/sh
# Pulls the latest images pushed by .github/workflows/deploy.yml and
# restarts whatever changed. Runs on the production host itself, on a
# timer, because that host has no public/routable address a GitHub-hosted
# runner could ever SSH into. `docker compose up -d` only recreates a
# container whose image or config actually differs from what is running,
# so it is safe to run this unconditionally every tick rather than only
# when something is known to have changed.
set -eu
cd /opt/rooman-bookings

# Pulled one at a time, smallest first, with a dangling-only prune between
# each: this host's ~7.8G disk cannot always hold two full copies of every
# image's layers at once mid-pull, and repeatedly hit "no space left on
# device" pulling everything in one `docker compose pull`.
#
# `docker image prune -f` (no -a) only removes untagged/dangling layers,
# never a tagged image — `-a` looks like a stronger cleanup but removes
# any image not currently backing a running container, which deletes an
# image this same loop just pulled but hasn't started yet.
for svc in api web migrate worker; do
  docker compose -f docker-compose.prod.yml pull "$svc"
  docker image prune -f > /dev/null
done

# Not `up -d`: that only starts the container and returns immediately.
# This attaches until migrate exits and fails the script (leaving web and
# worker on the previous, still-working images) if migrations fail.
docker compose -f docker-compose.prod.yml up migrate --no-build --exit-code-from migrate

docker compose -f docker-compose.prod.yml up -d --remove-orphans --no-build

# Now safe to reclaim anything left over from the previous version of an
# image that just got replaced.
docker image prune -f > /dev/null
