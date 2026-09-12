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

docker compose -f docker-compose.prod.yml pull --quiet

# Not `up -d`: that only starts the container and returns immediately.
# This attaches until migrate exits and fails the script (leaving web and
# worker on the previous, still-working images) if migrations fail.
docker compose -f docker-compose.prod.yml up migrate --no-build --exit-code-from migrate

docker compose -f docker-compose.prod.yml up -d --remove-orphans --no-build

# This host's disk is small; without pruning, a run every few minutes is
# enough to fill it within days.
docker image prune -f > /dev/null
