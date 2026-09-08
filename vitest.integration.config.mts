import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const stubs = resolve(root, 'apps/web/test/integration/stubs');

/**
 * Integration suites. These run against a real PostgreSQL, because the
 * behaviour they cover — tenant isolation, the double-booking exclusion
 * constraint, transactional signup, availability against real schedules —
 * cannot be reproduced against a mock.
 *
 * Requires DATABASE_URL to point at a disposable database: the suites truncate
 * tables between tests.
 */
export default defineConfig({
  resolve: {
    alias: [
      // Server actions are called directly rather than through a request, so
      // the Next.js runtime modules they import are stubbed.
      { find: /^server-only$/, replacement: resolve(stubs, 'server-only.ts') },
      { find: /^next\/headers$/, replacement: resolve(stubs, 'next-headers.ts') },
      { find: /^next\/cache$/, replacement: resolve(stubs, 'next-cache.ts') },
      { find: /^@\/(.*)$/, replacement: resolve(root, 'apps/web/$1') },
    ],
  },
  test: {
    include: ['**/test/integration/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/.next/**'],
    environment: 'node',
    // The suites share one database, so they must not run concurrently.
    fileParallelism: false,
    hookTimeout: 60_000,
    testTimeout: 60_000,
  },
});
