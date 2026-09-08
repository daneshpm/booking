/**
 * Workflow runner.
 *
 *   run     one sweep, then exit. For cron or a scheduled CI job.
 *   worker  sweep on a loop. For a long-running container.
 *
 * Both are safe to run concurrently with each other: deliveries are claimed
 * through a unique index, so nothing is sent twice.
 */
import { loadEnvFile } from '@bookings/database/load-env';
import { prisma } from '@bookings/database';
import { countExpiredReminders, runScheduledWorkflows } from './scheduler';

loadEnvFile();

/**
 * Seconds between sweeps.
 *
 * Clamped and validated: an unparseable value would otherwise reach setTimeout
 * as NaN, which fires immediately and turns the worker into a hot loop against
 * the database.
 */
function resolveInterval(): number {
  const raw = Number(process.env.WORKFLOW_INTERVAL_SECONDS);
  if (!Number.isFinite(raw) || raw <= 0) return 60;
  return Math.min(Math.max(Math.round(raw), 5), 3600);
}

const INTERVAL_SECONDS = resolveInterval();

function log(message: string, detail?: Record<string, unknown>): void {
  const stamp = new Date().toISOString();
  console.log(detail ? `${stamp} ${message} ${JSON.stringify(detail)}` : `${stamp} ${message}`);
}

async function sweep(): Promise<void> {
  const started = Date.now();
  const summary = await runScheduledWorkflows();

  if (summary.attempted > 0 || summary.bookingsDue > 0) {
    log('workflow sweep', { ...summary, ms: Date.now() - started });
  }

  // A long outage silently dropping a day of reminders is worse than a noisy
  // log line, so anything past the catch-up window is reported.
  const expired = await countExpiredReminders().catch(() => 0);
  if (expired > 0) {
    console.warn(
      `${new Date().toISOString()} WARNING ${expired} reminder(s) fell outside the catch-up ` +
        'window and will not be sent. The worker was likely stopped for a while.'
    );
  }
}

async function runOnce(): Promise<void> {
  await sweep();
}

async function runForever(): Promise<void> {
  let stopping = false;
  let wake: (() => void) | null = null;

  const stop = (signal: string) => {
    if (stopping) return;
    stopping = true;
    log(`received ${signal}, finishing the current sweep then exiting`);
    // Cut the wait short so shutdown does not sit out the whole interval.
    wake?.();
  };

  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));

  log('workflow worker started', { intervalSeconds: INTERVAL_SECONDS });

  while (!stopping) {
    try {
      await sweep();
    } catch (err) {
      // A failed sweep must not kill the worker; the next one retries.
      console.error('Workflow sweep failed:', err instanceof Error ? err.message : err);
    }

    if (stopping) break;

    // Interruptible: a plain sleep would hold the process for the full
    // interval after SIGTERM, long enough for a container runtime to escalate
    // to SIGKILL mid-sweep.
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, INTERVAL_SECONDS * 1000);
      wake = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    wake = null;
  }

  log('workflow worker stopped');
}

async function main(): Promise<void> {
  const mode = process.argv[2] || 'run';

  if (mode === 'run') {
    await runOnce();
    return;
  }
  if (mode === 'worker') {
    await runForever();
    return;
  }

  console.error(`Unknown mode "${mode}". Use "run" or "worker".`);
  process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error('Workflow runner failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
