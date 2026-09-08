import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /*
     * Unit suites only. Integration suites live under test/integration and need
     * a live PostgreSQL, so they run from vitest.integration.config.mts in CI
     * where a database service is available.
     */
    include: ['packages/**/test/**/*.spec.ts', 'apps/web/test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/test/integration/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'packages/core/src/**/*.ts',
        'packages/auth/src/**/*.ts',
        'packages/features/*/src/**/*.ts',
        'apps/web/lib/**/*.ts',
      ],
      exclude: [
        '**/*.d.ts',
        '**/index.ts',
        // Instantiates a Prisma client at import time, so reporting on it would
        // require a live DATABASE_URL just to compute coverage.
        'packages/database/**',
        'packages/auth/src/next.ts',
        'apps/web/lib/session.ts',
        'apps/web/lib/notifications.ts',
        'apps/web/lib/mailer.ts',
      ],
    },
  },
});
