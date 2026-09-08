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
  } catch {
    // Unique violation: another worker holds this one.
    return null;
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

  if (workflows.length === 0) {
    // With no workflow configured, booking creation and cancellation still send
    // the built-in transactional email. Customers expect those; they are not
    // optional marketing. Lifecycle events fire once each, so they are not
    // claimed.
    if (trigger === 'BOOKING_CREATED' || trigger === 'BOOKING_CANCELLED') {
      jobs.push({
        workflowId: null,
        channel: 'EMAIL',
        recipient: booking.customer.email,
        message: defaultMessage(trigger, context),
        claim: false,
      });
    }
  } else {
    for (const workflow of workflows) {
      jobs.push(...planForWorkflow(workflow, booking, trigger, context, false));
    }
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
