import 'server-only';

import { prisma, type WorkflowTrigger, type Prisma } from '@bookings/database';
import { formatInTimeZone } from 'date-fns-tz';
import { sendMail, isMailConfigured } from '@/lib/mailer';

type BookingWithRelations = Prisma.BookingGetPayload<{
  include: { workspace: true; service: true; staff: true; customer: true };
}>;

export interface RenderedMessage {
  subject: string;
  text: string;
}

/** Values available to workflow templates as {{placeholders}}. */
export function buildTemplateContext(booking: BookingWithRelations): Record<string, string> {
  const tz = booking.customerTimezone || booking.workspace.timezone || 'UTC';
  return {
    customerName: booking.customer.name,
    customerEmail: booking.customer.email,
    staffName: booking.staff.name,
    staffEmail: booking.staff.email,
    serviceName: booking.service.name,
    workspaceName: booking.workspace.name,
    date: formatInTimeZone(booking.startTime, tz, 'EEEE, d MMMM yyyy'),
    time: formatInTimeZone(booking.startTime, tz, 'h:mm a'),
    endTime: formatInTimeZone(booking.endTime, tz, 'h:mm a'),
    timezone: tz,
    durationMinutes: String(booking.service.durationMinutes),
    meetingLink: booking.meetingLink ?? '',
    location: booking.service.locationDetails ?? '',
  };
}

/**
 * Substitute {{placeholders}} in a template.
 * An unknown placeholder resolves to an empty string rather than being left in
 * the message, so customers never see raw template syntax.
 */
export function renderTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => context[key] ?? '');
}

/** Default wording used when a workflow does not define its own template. */
function defaultMessage(
  trigger: WorkflowTrigger,
  context: Record<string, string>
): RenderedMessage {
  const when = `${context.date} at ${context.time} (${context.timezone})`;
  const joinLine = context.meetingLink ? `\n\nJoin here: ${context.meetingLink}` : '';
  const locationLine = context.location ? `\n\nLocation: ${context.location}` : '';

  switch (trigger) {
    case 'BOOKING_CANCELLED':
      return {
        subject: `Cancelled: ${context.serviceName} on ${context.date}`,
        text: `Hello ${context.customerName},\n\nYour ${context.serviceName} appointment with ${context.workspaceName} on ${when} has been cancelled.\n\nIf this was not expected, please contact us to rebook.\n\n— ${context.workspaceName}`,
      };
    case 'BOOKING_RESCHEDULED':
      return {
        subject: `Rescheduled: ${context.serviceName} is now ${context.date}`,
        text: `Hello ${context.customerName},\n\nYour ${context.serviceName} appointment with ${context.workspaceName} has moved to ${when}.${joinLine}${locationLine}\n\n— ${context.workspaceName}`,
      };
    case 'BEFORE_APPOINTMENT':
      return {
        subject: `Reminder: ${context.serviceName} on ${context.date}`,
        text: `Hello ${context.customerName},\n\nThis is a reminder for your ${context.serviceName} appointment with ${context.staffName} on ${when}.${joinLine}${locationLine}\n\n— ${context.workspaceName}`,
      };
    case 'AFTER_APPOINTMENT':
      return {
        subject: `Thank you for meeting with ${context.workspaceName}`,
        text: `Hello ${context.customerName},\n\nThank you for attending your ${context.serviceName} session with ${context.staffName}.\n\nWe would welcome any feedback.\n\n— ${context.workspaceName}`,
      };
    case 'BOOKING_CREATED':
    default:
      return {
        subject: `Confirmed: ${context.serviceName} on ${context.date}`,
        text: `Hello ${context.customerName},\n\nYour ${context.serviceName} appointment with ${context.staffName} at ${context.workspaceName} is confirmed for ${when}.\n\nDuration: ${context.durationMinutes} minutes.${joinLine}${locationLine}\n\n— ${context.workspaceName}`,
      };
  }
}

/** Resolve the address list for a workflow's recipient setting. */
function recipientsFor(
  recipient: 'CUSTOMER' | 'STAFF' | 'BOTH',
  booking: BookingWithRelations
): string[] {
  switch (recipient) {
    case 'STAFF':
      return [booking.staff.email];
    case 'BOTH':
      return [booking.customer.email, booking.staff.email];
    case 'CUSTOMER':
    default:
      return [booking.customer.email];
  }
}

/**
 * Run every active workflow bound to a booking lifecycle event.
 *
 * Each delivery is recorded in notification_logs whether it succeeds or fails,
 * so operators can see what was sent and retry what was not. Failures are
 * swallowed: the appointment is already committed and must not be rolled back
 * because a mail server was unreachable.
 */
export async function dispatchBookingNotifications(
  bookingId: string,
  trigger: WorkflowTrigger
): Promise<{ attempted: number; delivered: number }> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { workspace: true, service: true, staff: true, customer: true },
  });

  if (!booking) return { attempted: 0, delivered: 0 };

  const workflows = await prisma.workflow.findMany({
    where: { workspaceId: booking.workspaceId, trigger, isActive: true, channel: 'EMAIL' },
  });

  const context = buildTemplateContext(booking);

  // With no workflow configured, booking creation and cancellation still send
  // the built-in transactional email. Those are expected by the customer, not
  // optional marketing.
  const jobs: Array<{
    workflowId: string | null;
    recipients: string[];
    message: RenderedMessage;
  }> = [];

  if (workflows.length === 0) {
    if (trigger === 'BOOKING_CREATED' || trigger === 'BOOKING_CANCELLED') {
      jobs.push({
        workflowId: null,
        recipients: [booking.customer.email],
        message: defaultMessage(trigger, context),
      });
    }
  } else {
    for (const workflow of workflows) {
      const fallback = defaultMessage(trigger, context);
      jobs.push({
        workflowId: workflow.id,
        recipients: recipientsFor(workflow.recipient, booking),
        message: {
          subject: workflow.subject
            ? renderTemplate(workflow.subject, context)
            : fallback.subject,
          text: workflow.body ? renderTemplate(workflow.body, context) : fallback.text,
        },
      });
    }
  }

  let attempted = 0;
  let delivered = 0;

  for (const job of jobs) {
    for (const address of new Set(job.recipients.filter(Boolean))) {
      attempted += 1;

      const result = isMailConfigured()
        ? await sendMail({ to: address, subject: job.message.subject, text: job.message.text })
        : { delivered: false, error: 'SMTP is not configured for this deployment' };

      if (result.delivered) delivered += 1;

      await prisma.notificationLog
        .create({
          data: {
            workspaceId: booking.workspaceId,
            bookingId: booking.id,
            workflowId: job.workflowId,
            channel: 'EMAIL',
            recipient: address,
            subject: job.message.subject,
            status: result.delivered ? 'SENT' : 'FAILED',
            error: result.error ?? null,
            attempts: 1,
            sentAt: result.delivered ? new Date() : null,
          },
        })
        .catch((err) => console.error('Could not record notification log:', err));
    }
  }

  if (workflows.length > 0) {
    await prisma.workflow
      .updateMany({
        where: { id: { in: workflows.map((w) => w.id) } },
        data: { lastRunAt: new Date() },
      })
      .catch(() => undefined);
  }

  return { attempted, delivered };
}
