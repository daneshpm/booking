import { defineConfig } from 'vitest/config';

/**
 * Integration suites. These run against a real PostgreSQL database, because the
 * behaviour they cover — tenant isolation, the double-booking exclusion
 * constraint, transactional signup — cannot be reproduced against a mock.
 *
 * Requires DATABASE_URL to point at a disposable database: the suite truncates
 * tables between tests.
 */
export default defineConfig({
  test: {
    include: ['**/test/integration/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    environment: 'node',
    // Suites share one database, so they must not run concurrently.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
