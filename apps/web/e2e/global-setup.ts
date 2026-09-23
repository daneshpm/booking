import { seedE2E, E2E } from './fixtures';
import { __resetRateLimits } from '../lib/rate-limit';

/**
 * Seed immediately before the suite runs, every run.
 *
 * The fixtures cannot be assumed to survive between runs: the integration
 * suite truncates every table in the same database, so seeding once by hand
 * and running these later gives a confusing cascade of failures that look
 * like application bugs rather than missing data.
 */
export default async function globalSetup(): Promise<void> {
  // Login is limited to 10 per 15 minutes per address and the buckets live in
  // Redis, so they outlast a run. Two runs inside that window used to leave
  // the second one failing to sign in with what looked like a broken page.
  // The integration suite already resets for the same reason.
  await __resetRateLimits();

  await seedE2E();
  console.log(`[e2e] seeded workspace ${E2E.workspaceSlug}`);
}
