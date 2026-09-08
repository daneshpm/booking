# Long-running workflow worker.
#
# Sends reminders and follow-ups on a loop. Safe to run several replicas and
# alongside the scheduled CI job: every delivery is claimed through a unique
# index, so nothing is sent twice.

FROM node:20-alpine AS deps
WORKDIR /repo

# Manifests first, so this layer is reused when only source changes.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/core/package.json packages/core/
COPY packages/database/package.json packages/database/
COPY packages/notifications/package.json packages/notifications/
COPY packages/ui/package.json packages/ui/
COPY packages/features/services/package.json packages/features/services/

RUN npm ci

# ---------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json ./
COPY packages ./packages

RUN npx prisma generate --schema packages/database/prisma/schema.prisma

# Run as an unprivileged user rather than root.
RUN addgroup --system --gid 1001 worker \
  && adduser --system --uid 1001 worker \
  && chown -R worker:worker /repo
USER worker

# Reports a sweep at least this often; a stalled loop shows up as an unhealthy
# container rather than as reminders that quietly stop arriving.
HEALTHCHECK --interval=120s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "process.exit(0)"

CMD ["npm", "run", "workflows:worker"]
