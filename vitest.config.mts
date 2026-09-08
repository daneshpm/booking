import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    /*
     * Unit suites only. Integration suites live under **\/test\/integration and
     * need a live PostgreSQL, so they run from a separate config in CI where a
     * database service is available.
     */
    include: ['packages/**/test/**/*.spec.ts', 'apps/web/test/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/test/integration/**'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'packages/*/src/**/*.ts',
        'packages/features/*/src/**/*.ts',
        'apps/web/lib/**/*.ts',
      ],
      exclude: ['**/*.d.ts', '**/index.ts', 'packages/database/src/seed.ts'],
    },
  },
});
