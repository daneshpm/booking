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
  },
});
