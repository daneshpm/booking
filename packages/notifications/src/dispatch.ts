import { prisma, type Prisma, type WorkflowTrigger } from '@bookings/database';
import { isMailConfigured, sendMail } from './channels/email';
import { isSmsConfigured, sendSms } from './channels/sms';
import { sendWebhook } from './channels/webhook';
import type { DeliveryResult } from './channels/types';
import {
  buildTemplateContext,
  defaultMessage,
  recipientsFor,
  renderTemplate,
  type RenderedMessage,
} from './templates';

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: { workspace: true; service: true; staff: true; customer: true };
}>;

export interface DispatchSummary {
  attempted: number;
  delivered: number;
  skipped: number;
}

/** One planned delivery: who, on what channel, with what content. */
interface Job {
  workflowId: string | null;
  channel: 'EMAIL' | 'SMS' | 'WEBHOOK';
  /** Email address, phone number, or webhook URL. */
  recipient: string;
  message: RenderedMessage;
  /** Set when the claim must be exactly-once, as for scheduled reminders. */
  claim: boolean;
}

/**
 * Phone numbers for a workflow's recipient setting.
 * A customer with no number on file simply has no SMS job planned.
 */
function phoneRecipients(
  recipient: 'CUSTOMER' | 'STAFF' | 'BOTH',
  booking: BookingWithRelations
): string[] {
  const numbers: string[] = [];
  if (recipient !== 'STAFF' && booking.customer.phone) numbers.push(booking.customer.phone);
  if (recipient !== 'CUSTOMER' && booking.staff.phone) numbers.push(booking.staff.phone);
  return numbers;
}

async function deliver(job: Job, booking: BookingWithRelations): Promise<DeliveryResult> {
  switch (job.channel) {
    case 'SMS':
      return isSmsConfigured()
        ? sendSms({ to: job.recipient, body: job.message.text })
        : { delivered: false, error: 'SMS delivery is not configured for this deployment' };

    case 'WEBHOOK':
      return sendWebhook(job.recipient, {
        event: job.message.subject,
        workspaceId: booking.workspaceId,
        bookingId: booking.id,
        occurredAt: new Date().toISOString(),
        data: {
          bookingId: booking.id,
          status: booking.status,
          startTime: booking.startTime.toISOString(),
          endTime: booking.endTime.toISOString(),
          service: { id: booking.serviceId, name: booking.service.name },
          staff: { id: booking.staffId, name: booking.staff.name },
          customer: {
            name: booking.customer.name,
            email: booking.customer.email,
            phone: booking.customer.phone,
          },
          meetingLink: booking.meetingLink,
        },
      });

    case 'EMAIL':
    default:
      return isMailConfigured()
        ? sendMail({ to: job.recipient, subject: job.message.subject, text: job.message.text })
        : { delivered: false, error: 'SMTP is not configured for this deployment' };
  }
}

/** Unique index that makes a notification delivery claimable by one worker. */
const CLAIM_CONSTRAINT = 'notification_logs_workflow_id_booking_id_recipient_key';

/**
 * Record a delivery, claiming it first when it must happen exactly once.
 *
 * For a scheduled reminder the log row is inserted *before* sending. The unique
 * index on (workflow, booking, recipient) makes that insert the claim, so two
 * workers running at the same time cannot both send it. If the claim fails the
 * work already belongs to someone else and this call does nothing.
 *
 * Returns null when the claim was lost.
 */
async function claimJob(job: Job, booking: BookingWithRelations): Promise<string | null> {
  if (!job.claim || !job.workflowId) return 'unclaimed';

  try {
    const row = await prisma.notificationLog.create({
      data: {
        workspaceId: booking.workspaceId,
        bookingId: booking.id,
        workflowId: job.workflowId,
        channel: job.channel,
        recipient: job.recipient,
        subject: job.message.subject,
        status: 'PENDING',
        attempts: 0,
      },
      select: { id: true },
    });
    return row.id;
  } catch (err) {
    // A unique violation on this insert is the only error that means another
    // worker holds this delivery. Treating every failure that way would let a
    // database outage look like healthy operation in the sweep summary, so the
    // match stays pinned to the unique-violation codes (P2002 from Prisma,
    // 23505 when the driver surfaces the raw Postgres error) and to this
    // constraint by name -- never to a bare "duplicate key" anywhere in the
    // message, which any other constraint would also produce.
    const code = (err as { code?: string })?.code;
    const causeCode = (err as { cause?: { code?: string } })?.cause?.code;
    const message = [
      (err as { message?: string })?.message,
      (err as { cause?: { message?: string } })?.cause?.message,
      (err as { meta?: { message?: string } })?.meta?.message,
    ]
      .filter((value): value is string => typeof value === 'string')
      .join(' ');

    if (
      code === 'P2002' ||
      code === '23505' ||
      causeCode === '23505' ||
      message.includes(CLAIM_CONSTRAINT)
    ) {
      return null; // Another worker already owns this delivery
    }
    throw err;
  }
}

async function recordResult(
  logId: string | null,
  job: Job,
  booking: BookingWithRelations,
  result: DeliveryResult
): Promise<void> {
  const status = result.delivered ? 'SENT' : 'FAILED';

  if (logId && logId !== 'unclaimed') {
    await prisma.notificationLog
      .update({
        where: { id: logId },
        data: {
          status,
          error: result.error ?? null,
          attempts: { increment: 1 },
          sentAt: result.delivered ? new Date() : null,
        },
      })
      .catch((err) => console.error('Could not update notification log:', err));
    return;
  }

  await prisma.notificationLog
    .create({
      data: {
        workspaceId: booking.workspaceId,
        bookingId: booking.id,
        workflowId: job.workflowId,
        channel: job.channel,
        recipient: job.recipient,
        subject: job.message.subject,
        status,
        error: result.error ?? null,
        attempts: 1,
        sentAt: result.delivered ? new Date() : null,
      },
    })
    .catch((err) => console.error('Could not record notification log:', err));
}

/** Turn one workflow into the deliveries it implies for a booking. */
function planForWorkflow(
  workflow: {
    id: string;
    channel: string;
    recipient: string;
    subject: string | null;
    body: string | null;
    webhookUrl: string | null;
  },
  booking: BookingWithRelations,
  trigger: WorkflowTrigger,
  context: Record<string, string>,
  claim: boolean
): Job[] {
  const fallback = defaultMessage(trigger, context);
  const message: RenderedMessage = {
    subject: workflow.subject ? renderTemplate(workflow.subject, context) : fallback.subject,
    text: workflow.body ? renderTemplate(workflow.body, context) : fallback.text,
  };

  if (workflow.channel === 'WEBHOOK') {
    if (!workflow.webhookUrl) return [];
    return [
      {
        workflowId: workflow.id,
        channel: 'WEBHOOK',
        recipient: workflow.webhookUrl,
        message: { subject: trigger, text: message.text },
        claim,
      },
    ];
  }

  if (workflow.channel === 'SMS') {
    return phoneRecipients(workflow.recipient as 'CUSTOMER' | 'STAFF' | 'BOTH', booking).map(
      (phone) => ({
        workflowId: workflow.id,
        channel: 'SMS' as const,
        recipient: phone,
        message,
        claim,
      })
    );
  }

  return recipientsFor(workflow.recipient as 'CUSTOMER' | 'STAFF' | 'BOTH', booking).map(
    (email) => ({
      workflowId: workflow.id,
      channel: 'EMAIL' as const,
      recipient: email,
      message,
      claim,
    })
  );
}

async function runJobs(jobs: Job[], booking: BookingWithRelations): Promise<DispatchSummary> {
  let attempted = 0;
  let delivered = 0;
  let skipped = 0;

  const seen = new Set<string>();

  for (const job of jobs) {
    const key = `${job.workflowId ?? 'builtin'}:${job.channel}:${job.recipient}`;
    if (!job.recipient || seen.has(key)) continue;
    seen.add(key);

    const logId = await claimJob(job, booking);
    if (logId === null) {
      // Another worker already owns this delivery.
      skipped += 1;
      continue;
    }

    attempted += 1;
    const result = await deliver(job, booking);
    if (result.delivered) delivered += 1;

    await recordResult(logId, job, booking, result);
  }

  return { attempted, delivered, skipped };
}

/**
 * Run every active workflow bound to a booking lifecycle event.
 *
 * Failures are swallowed: the appointment is already committed and must not be
 * rolled back because a mail server was unreachable. Every attempt is recorded
 * so an operator can see what happened.
 */
export async function dispatchBookingNotifications(
  bookingId: string,
  trigger: WorkflowTrigger
): Promise<DispatchSummary> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { workspace: true, service: true, staff: true, customer: true },
  });

  if (!booking) return { attempted: 0, delivered: 0, skipped: 0 };

  const workflows = await prisma.workflow.findMany({
    where: { workspaceId: booking.workspaceId, trigger, isActive: true },
  });

  const context = buildTemplateContext(booking);
  const jobs: Job[] = [];

  for (const workflow of workflows) {
    jobs.push(...planForWorkflow(workflow, booking, trigger, context, false));
  }

  // Booking creation and cancellation always send the built-in transactional
  // email to the customer. Customers expect those; they are not optional
  // marketing. It is suppressed only when a workflow already emails them, so
  // adding a webhook or SMS workflow does not silently stop confirmations.
  const customerAlreadyEmailed = jobs.some(
    (job) => job.channel === 'EMAIL' && job.recipient === booking.customer.email
  );

  if (
    !customerAlreadyEmailed &&
    (trigger === 'BOOKING_CREATED' || trigger === 'BOOKING_CANCELLED')
  ) {
    jobs.push({
      workflowId: null,
      channel: 'EMAIL',
      recipient: booking.customer.email,
      message: defaultMessage(trigger, context),
      claim: false,
    });
  }

  const summary = await runJobs(jobs, booking);

  if (workflows.length > 0) {
    await prisma.workflow
      .updateMany({
        where: { id: { in: workflows.map((w) => w.id) } },
        data: { lastRunAt: new Date() },
      })
      .catch(() => undefined);
  }

  return summary;
}

/**
 * Send the deliveries a single scheduled workflow implies for one booking.
 *
 * Claimed, so a reminder is sent at most once however many workers are running
 * and however often the sweep repeats.
 */
export async function dispatchScheduledWorkflow(
  workflow: {
    id: string;
    trigger: WorkflowTrigger;
    channel: string;
    recipient: string;
    subject: string | null;
    body: string | null;
    webhookUrl: string | null;
  },
  bookingId: string
): Promise<DispatchSummary> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { workspace: true, service: true, staff: true, customer: true },
  });

  if (!booking) return { attempted: 0, delivered: 0, skipped: 0 };

  const context = buildTemplateContext(booking);
  const jobs = planForWorkflow(workflow, booking, workflow.trigger, context, true);
  return runJobs(jobs, booking);
}

/**
 * Longest a delivery may sit claimed before it is considered abandoned.
 *
 * Comfortably beyond the slowest send: the SMS provider times out at 15
 * seconds and webhooks at 10, so anything still PENDING after this belongs to
 * a process that died rather than one still working.
 */
const STALE_CLAIM_MINUTES = 15;

/** Give up after this many attempts rather than retrying a broken address forever. */
const MAX_ATTEMPTS = 3;

/**
 * Retry deliveries that were claimed but never completed.
 *
 * A worker claims a send by inserting a PENDING row, then sends, then records
 * the outcome. A crash in between leaves the row PENDING and, without this,
 * the reminder would never be sent and never be retried: lost silently, which
 * is the worst way for a notification system to fail.
 *
 * The retry re-claims atomically by incrementing attempts only while the row is
 * still PENDING, so a worker that is genuinely mid-send does not get its work
 * taken.
 */
export async function retryStalledDeliveries(now: Date = new Date()): Promise<DispatchSummary> {
  const cutoff = new Date(now.getTime() - STALE_CLAIM_MINUTES * 60_000);

  const stalled = await prisma.notificationLog.findMany({
    where: {
      // PENDING is a claim whose worker died. FAILED is a send that did not
      // land, usually a mail server refusing a connection. Both need another
      // go: without FAILED here, a single transient failure lost the reminder
      // permanently, because the claim row blocks every later sweep.
      status: { in: ['PENDING', 'FAILED'] },
      createdAt: { lte: cutoff },
      attempts: { lt: MAX_ATTEMPTS },
      bookingId: { not: null },
      workflowId: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });

  let attempted = 0;
  let delivered = 0;
  let skipped = 0;

  for (const row of stalled) {
    // Atomic re-claim: only one worker can move this row off its current
    // attempt count.
    const claimed = await prisma.notificationLog.updateMany({
      where: { id: row.id, status: row.status, attempts: row.attempts },
      data: { status: 'PENDING', attempts: { increment: 1 } },
    });

    if (claimed.count === 0) {
      skipped += 1;
      continue;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: row.bookingId! },
      include: { workspace: true, service: true, staff: true, customer: true },
    });

    if (!booking) {
      await prisma.notificationLog
        .update({
          where: { id: row.id },
          // Exhausted so the sweep stops reconsidering it.
          data: { status: 'FAILED', attempts: MAX_ATTEMPTS, error: 'Booking no longer exists' },
        })
        .catch(() => undefined);
      continue;
    }

    // The sweep excludes cancelled appointments, but a booking can be cancelled
    // between the original claim and this retry. Reminding someone about an
    // appointment that is no longer happening is worse than sending nothing.
    if (booking.status === 'CANCELLED') {
      await prisma.notificationLog
        .update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            attempts: MAX_ATTEMPTS,
            error: 'Appointment was cancelled before the notification was sent',
          },
        })
        .catch(() => undefined);
      continue;
    }

    const workflow = await prisma.workflow.findUnique({ where: { id: row.workflowId! } });
    if (!workflow || !workflow.isActive) {
      await prisma.notificationLog
        .update({
          where: { id: row.id },
          data: {
            status: 'FAILED',
            attempts: MAX_ATTEMPTS,
            error: 'Workflow was removed or disabled',
          },
        })
        .catch(() => undefined);
      continue;
    }

    const context = buildTemplateContext(booking);
    const fallback = defaultMessage(workflow.trigger, context);
    const job: Job = {
      workflowId: workflow.id,
      channel: row.channel,
      recipient: row.recipient,
      message: {
        subject: workflow.subject ? renderTemplate(workflow.subject, context) : fallback.subject,
        text: workflow.body ? renderTemplate(workflow.body, context) : fallback.text,
      },
      claim: true,
    };

    attempted += 1;

    // A single unrenderable booking must not abort the whole retry pass.
    let result: DeliveryResult;
    try {
      result = await deliver(job, booking);
    } catch (err) {
      result = {
        delivered: false,
        error: err instanceof Error ? err.message : 'Delivery threw an unexpected error',
      };
    }

    if (result.delivered) delivered += 1;

    await prisma.notificationLog
      .update({
        where: { id: row.id },
        data: {
          status: result.delivered ? 'SENT' : 'FAILED',
          error: result.error ?? null,
          sentAt: result.delivered ? new Date() : null,
        },
      })
      .catch((err) => console.error('Could not update notification log:', err));
  }

  return { attempted, delivered, skipped };
}

/**
 * Forget the time-based notifications already recorded for a booking.
 *
 * The delivery claim is keyed on (workflow, booking, recipient) with no time
 * component, so a reminder sent for the old slot would block one ever being
 * sent for the new one. Clearing those rows lets the sweep reconsider the
 * booking against its new start time.
 *
 * Only reminders and follow-ups are cleared. Lifecycle records, such as the
 * confirmation actually sent to the customer, are history and stay put.
 */
export async function clearScheduledNotifications(bookingId: string): Promise<number> {
  const result = await prisma.notificationLog.deleteMany({
    where: {
      bookingId,
      workflow: { trigger: { in: ['BEFORE_APPOINTMENT', 'AFTER_APPOINTMENT'] } },
    },
  });
  return result.count;
}
