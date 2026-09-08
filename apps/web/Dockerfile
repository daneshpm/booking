# Multi-stage build for the Next.js application.
#
# The final image carries only the standalone server output and its runtime
# dependencies, so no source, build cache or dev dependency ships to production.

# ---------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /repo

# Copy only the manifests first so this layer is reused whenever dependencies
# are unchanged, even if application code was edited.
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/auth/package.json packages/auth/
COPY packages/core/package.json packages/core/
COPY packages/database/package.json packages/database/
COPY packages/ui/package.json packages/ui/
COPY packages/features/services/package.json packages/features/services/

RUN npm ci

# ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /repo

COPY --from=deps /repo/node_modules ./node_modules
COPY . .

RUN npm run db:generate

# Prisma needs a URL to initialise at build time; no query is executed, so this
# placeholder never has to resolve.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build --workspace=@bookings/web

# ---------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user rather than root.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /repo/apps/web/public ./apps/web/public

# Migrations and the Prisma schema travel with the image so a release can apply
# them before the new version starts serving traffic.
COPY --from=builder --chown=nextjs:nodejs /repo/packages/database/prisma ./prisma

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]
