import 'server-only';

import { prisma, type WorkflowTrigger } from '@bookings/database';
import { sendMail, isMailConfigured } from '@/lib/mailer';
import {
  buildTemplateContext,
  defaultMessage,
  recipientsFor,
  renderTemplate,
  type RenderedMessage,
} from '@/lib/notification-templates';

export { buildTemplateContext, renderTemplate } from '@/lib/notification-templates';

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

  const jobs: Array<{
    workflowId: string | null;
    recipients: string[];
    message: RenderedMessage;
  }> = [];

  if (workflows.length === 0) {
    // With no workflow configured, booking creation and cancellation still send
    // the built-in transactional email. Customers expect those; they are not
    // optional marketing.
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
          subject: workflow.subject ? renderTemplate(workflow.subject, context) : fallback.subject,
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
