import { prisma } from '@bookings/database';
import { dispatchScheduledWorkflow, retryStalledDeliveries } from './dispatch';
import { logger } from '@bookings/core';

/**
 * Time-based workflow runner.
 *
 * A reminder is due at `booking.startTime + workflow.offsetMinutes`, where the
 * offset is negative for BEFORE_APPOINTMENT and positive for AFTER_APPOINTMENT.
 * Each sweep looks for bookings whose due moment has passed and whose reminder
 * has not been claimed yet.
 *
 * Two properties matter more than throughput here:
 *
 * Exactly once. The claim is an insert into notification_logs guarded by a
 * unique index, so overlapping sweeps and multiple workers cannot double-send.
 *
 * Bounded catch-up. After an outage the worker must not deliver a flood of
 * reminders for appointments that have already happened. Anything older than
 * the catch-up window is passed over, and recorded as skipped.
 */

/** How far back a sweep will still deliver a missed reminder. */
export const DEFAULT_CATCH_UP_MINUTES = 120;

/** Most bookings examined per workflow in one sweep. */
const MAX_BOOKINGS_PER_WORKFLOW = 500;

export interface SweepOptions {
  now?: Date;
  catchUpMinutes?: number;
}

export interface SweepSummary {
  workflowsConsidered: number;
  bookingsDue: number;
  attempted: number;
  delivered: number;
  /** Already claimed by another worker, or by an earlier sweep. */
  skipped: number;
  /** Passed over because the due moment was older than the catch-up window. */
  expired: number;
  /** Bookings that threw while being processed and were stepped over. */
  failed: number;
}

/**
 * The booking start-time range whose reminders are due now.
 *
 * due = start + offset, so start = due - offset. A due moment between
 * `now - catchUp` and `now` maps to a start time between those bounds shifted
 * by the offset.
 */
export function dueStartTimeRange(
  offsetMinutes: number,
  now: Date,
  catchUpMinutes: number
): { from: Date; to: Date } {
  const offsetMs = offsetMinutes * 60_000;
  const catchUpMs = catchUpMinutes * 60_000;
  return {
    from: new Date(now.getTime() - catchUpMs - offsetMs),
    to: new Date(now.getTime() - offsetMs),
  };
}

/**
 * Run one sweep across every active time-based workflow.
 *
 * Safe to call as often as you like; work already claimed is skipped.
 */
export async function runScheduledWorkflows(options: SweepOptions = {}): Promise<SweepSummary> {
  const now = options.now ?? new Date();
  const catchUpMinutes = options.catchUpMinutes ?? DEFAULT_CATCH_UP_MINUTES;

  // A worker that died between claiming a delivery and sending it left the row
  // PENDING. Picking those up first means a crash delays a reminder rather
  // than losing it silently.
  const retried = await retryStalledDeliveries(now).catch((err) => {
    logger.error('Retrying stalled deliveries failed', {
      err: err instanceof Error ? err.message : err,
    });
    return { attempted: 0, delivered: 0, skipped: 0 };
  });

  const workflows = await prisma.workflow.findMany({
    where: {
      isActive: true,
      trigger: { in: ['BEFORE_APPOINTMENT', 'AFTER_APPOINTMENT'] },
      offsetMinutes: { not: 0 },
    },
  });

  const summary: SweepSummary = {
    workflowsConsidered: workflows.length,
    bookingsDue: 0,
    attempted: retried.attempted,
    delivered: retried.delivered,
    skipped: retried.skipped,
    expired: 0,
    failed: 0,
  };

  for (const workflow of workflows) {
    const { from, to } = dueStartTimeRange(workflow.offsetMinutes, now, catchUpMinutes);

    const bookings = await prisma.booking.findMany({
      where: {
        workspaceId: workflow.workspaceId,
        // Unset scopes the workflow to every service in the workspace.
        ...(workflow.serviceId ? { serviceId: workflow.serviceId } : {}),
        // A cancelled appointment needs no reminder, and a no-show needs no
        // follow-up.
        status: { in: ['CONFIRMED', 'PENDING', 'RESCHEDULED', 'COMPLETED'] },
        startTime: { gt: from, lte: to },
      },
      select: { id: true },
      orderBy: { startTime: 'asc' },
      take: MAX_BOOKINGS_PER_WORKFLOW,
    });

    summary.bookingsDue += bookings.length;

    for (const booking of bookings) {
      // Isolated per booking. Rendering a template throws on an unresolvable
      // customer timezone, and one such booking would otherwise abort the sweep
      // for every workflow and every tenant, on every run, until it aged out of
      // the window.
      try {
        const result = await dispatchScheduledWorkflow(workflow, booking.id);
        summary.attempted += result.attempted;
        summary.delivered += result.delivered;
        summary.skipped += result.skipped;
      } catch (err) {
        summary.failed += 1;
        logger.error('Workflow delivery failed', {
          workflowId: workflow.id,
          bookingId: booking.id,
          err: err instanceof Error ? err.message : err,
        });
      }
    }

    if (bookings.length > 0) {
      await prisma.workflow
        .update({ where: { id: workflow.id }, data: { lastRunAt: now } })
        .catch(() => undefined);
    }
  }

  return summary;
}

/**
 * Count reminders that fell outside the catch-up window and will never be sent.
 *
 * Reported so a long outage is visible rather than silently swallowing a day of
 * reminders.
 */
export async function countExpiredReminders(options: SweepOptions = {}): Promise<number> {
  const now = options.now ?? new Date();
  const catchUpMinutes = options.catchUpMinutes ?? DEFAULT_CATCH_UP_MINUTES;

  const workflows = await prisma.workflow.findMany({
    where: {
      isActive: true,
      trigger: { in: ['BEFORE_APPOINTMENT', 'AFTER_APPOINTMENT'] },
      offsetMinutes: { not: 0 },
    },
    select: { id: true, workspaceId: true, offsetMinutes: true, serviceId: true },
  });

  let expired = 0;

  for (const workflow of workflows) {
    // Due before the catch-up window opened.
    const cutoff = new Date(
      now.getTime() - catchUpMinutes * 60_000 - workflow.offsetMinutes * 60_000
    );
    // Only look a day back, so this stays cheap.
    const floor = new Date(cutoff.getTime() - 24 * 60 * 60 * 1000);

    const candidates = await prisma.booking.findMany({
      where: {
        workspaceId: workflow.workspaceId,
        ...(workflow.serviceId ? { serviceId: workflow.serviceId } : {}),
        status: { in: ['CONFIRMED', 'PENDING', 'RESCHEDULED', 'COMPLETED'] },
        startTime: { gt: floor, lte: cutoff },
      },
      select: { id: true },
      take: MAX_BOOKINGS_PER_WORKFLOW,
    });

    if (candidates.length === 0) continue;

    const sent = await prisma.notificationLog.count({
      where: { workflowId: workflow.id, bookingId: { in: candidates.map((b) => b.id) } },
    });

    expired += Math.max(0, candidates.length - sent);
  }

  return expired;
}
