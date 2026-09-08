# Long-running workflow worker.
#
# Sends reminders and follow-ups on a loop. Safe to run several replicas and
# alongside the scheduled CI job: every delivery is claimed through a unique
# index, so nothing is sent twice.

# ---------------------------------------------------------------
FROM node:26-alpine AS deps
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
FROM node:26-alpine AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY package.json ./
COPY packages ./packages

# The Prisma CLI lives in the dev dependencies, so the client is generated here
# and only its output travels to the runtime image.
RUN npx prisma generate --schema packages/database/prisma/schema.prisma

# Drop the build-only dependencies, which is what keeps the Prisma CLI and the
# database drivers it bundles for other engines out of the final image.
RUN npm prune --omit=dev

# ---------------------------------------------------------------
FROM node:26-alpine AS runner
WORKDIR /repo

ENV NODE_ENV=production

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/packages ./packages

# Run as an unprivileged user rather than root.
RUN addgroup --system --gid 1001 worker \
  && adduser --system --uid 1001 worker \
  && chown -R worker:worker /repo
USER worker

CMD ["npm", "run", "workflows:worker"]
