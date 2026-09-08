import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 no longer accepts a connection URL inside schema.prisma. Migrate and
 * the other CLI commands read it from here; the runtime client gets it through
 * the driver adapter in src/client.ts instead.
 */

/**
 * Scratch database used when replaying a migrations directory, which only
 * `migrate dev` and `migrate diff --from-migrations` need.
 *
 * Deliberately left unset when SHADOW_DATABASE_URL is absent. Prisma drops and
 * recreates whatever this points at, so defaulting it to the main database
 * would be destructive; Prisma refuses that case outright, which would also
 * break `migrate deploy` for everyone who never asked for a shadow database.
 */
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL?.trim();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    ...(shadowDatabaseUrl ? { shadowDatabaseUrl } : {}),
  },
});
