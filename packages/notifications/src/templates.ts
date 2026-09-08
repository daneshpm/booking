import type { WorkflowTrigger } from '@bookings/database';
import { formatInTimeZone } from 'date-fns-tz';

/**
 * Pure message-building helpers.
 *
 * Kept free of `server-only` and of any database access so they can be unit
 * tested directly; the dispatcher in lib/notifications.ts wires them to Prisma
 * and the mail transport.
 */

export interface RenderedMessage {
  subject: string;
  text: string;
}

export interface BookingTemplateSource {
  customer: { name: string; email: string };
  staff: { name: string; email: string };
  service: { name: string; durationMinutes: number; locationDetails: string | null };
  workspace: { name: string; timezone: string };
  startTime: Date;
  endTime: Date;
  customerTimezone: string | null;
  meetingLink: string | null;
}

/** Values available to workflow templates as {{placeholders}}. */
export function buildTemplateContext(booking: BookingTemplateSource): Record<string, string> {
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
 *
 * Substitution is single-pass, so a value that itself contains placeholder
 * syntax is left as literal text rather than expanded again. Without that, a
 * customer could inject a placeholder through their own name.
 *
 * An unknown placeholder resolves to an empty string, because a customer
 * seeing raw template syntax in an email is worse than seeing a gap.
 */
export function renderTemplate(template: string, context: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => context[key] ?? '');
}

/** Wording used when a workflow does not define its own template. */
export function defaultMessage(
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
        text: `Hello ${context.customerName},\n\nYour ${context.serviceName} appointment with ${context.workspaceName} on ${when} has been cancelled.\n\nIf this was not expected, please contact us to rebook.\n\n- ${context.workspaceName}`,
      };
    case 'BOOKING_RESCHEDULED':
      return {
        subject: `Rescheduled: ${context.serviceName} is now ${context.date}`,
        text: `Hello ${context.customerName},\n\nYour ${context.serviceName} appointment with ${context.workspaceName} has moved to ${when}.${joinLine}${locationLine}\n\n- ${context.workspaceName}`,
      };
    case 'BEFORE_APPOINTMENT':
      return {
        subject: `Reminder: ${context.serviceName} on ${context.date}`,
        text: `Hello ${context.customerName},\n\nThis is a reminder for your ${context.serviceName} appointment with ${context.staffName} on ${when}.${joinLine}${locationLine}\n\n- ${context.workspaceName}`,
      };
    case 'AFTER_APPOINTMENT':
      return {
        subject: `Thank you for meeting with ${context.workspaceName}`,
        text: `Hello ${context.customerName},\n\nThank you for attending your ${context.serviceName} session with ${context.staffName}.\n\nWe would welcome any feedback.\n\n- ${context.workspaceName}`,
      };
    case 'BOOKING_CREATED':
    default:
      return {
        subject: `Confirmed: ${context.serviceName} on ${context.date}`,
        text: `Hello ${context.customerName},\n\nYour ${context.serviceName} appointment with ${context.staffName} at ${context.workspaceName} is confirmed for ${when}.\n\nDuration: ${context.durationMinutes} minutes.${joinLine}${locationLine}\n\n- ${context.workspaceName}`,
      };
  }
}

/** Resolve the address list for a workflow's recipient setting. */
export function recipientsFor(
  recipient: 'CUSTOMER' | 'STAFF' | 'BOTH',
  booking: Pick<BookingTemplateSource, 'customer' | 'staff'>
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
