import { seedE2E, E2E } from './fixtures';

/**
 * Seed immediately before the suite runs, every run.
 *
 * The fixtures cannot be assumed to survive between runs: the integration
 * suite truncates every table in the same database, so seeding once by hand
 * and running these later gives a confusing cascade of failures that look
 * like application bugs rather than missing data.
 */
export default async function globalSetup(): Promise<void> {
  await seedE2E();
  console.log(`[e2e] seeded workspace ${E2E.workspaceSlug}`);
}
