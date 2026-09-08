import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI configuration.
 *
 * Prisma 7 no longer accepts a connection URL inside schema.prisma. Migrate and
 * the other CLI commands read it from here; the runtime client gets it through
 * the driver adapter in src/client.ts instead.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL ?? '',
    /*
     * Replaying a migrations directory needs a scratch database to apply them
     * into. Prisma 7 requires it here rather than as a CLI flag.
     *
     * SHADOW_DATABASE_URL should point at a disposable database: Prisma drops
     * and recreates its contents. Falling back to DATABASE_URL is only safe for
     * the throwaway database CI creates for the drift check, never for one
     * holding real data.
     */
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
