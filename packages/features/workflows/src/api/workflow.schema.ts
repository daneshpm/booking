import { z } from 'zod';

export const WORKFLOW_TRIGGERS = [
  'BOOKING_CREATED',
  'BOOKING_CANCELLED',
  'BOOKING_RESCHEDULED',
  'BEFORE_APPOINTMENT',
  'AFTER_APPOINTMENT',
] as const;

export const workflowSchema = z.object({
  name: z.string().trim().min(2, 'Give the workflow a name of at least 2 characters.').max(120),
  description: z.string().trim().max(500).optional().nullable(),
  /** Restricts the workflow to one service's bookings. Empty/null applies it workspace-wide. */
  serviceId: z.string().trim().optional().nullable(),
  trigger: z.enum(WORKFLOW_TRIGGERS),
  channel: z.enum(['EMAIL', 'SMS', 'WEBHOOK']),
  recipient: z.enum(['CUSTOMER', 'STAFF', 'BOTH']),
  /**
   * Minutes relative to the appointment start. Negative runs before it,
   * positive after. Capped at 30 days either way, since a reminder further out
   * than that is almost certainly a typo.
   */
  offsetMinutes: z.number().int().min(-43200).max(43200).default(0),
  subject: z.string().trim().max(200).optional().nullable(),
  body: z.string().trim().max(5000).optional().nullable(),
  webhookUrl: z.string().trim().url('Enter a valid webhook URL.').optional().nullable(),
  isActive: z.boolean().default(true),
});

export type WorkflowInput = z.input<typeof workflowSchema>;

export interface WorkflowActionResult {
  success: boolean;
  error?: string;
  workflowId?: string;
}

/** Reject a webhook target that is missing, or a time trigger with no offset. */
export function validateWorkflowCrossFields(data: z.infer<typeof workflowSchema>): string | null {
  if (data.channel === 'WEBHOOK' && !data.webhookUrl) {
    return 'A webhook workflow needs a destination URL.';
  }
  const isTimeBased = data.trigger === 'BEFORE_APPOINTMENT' || data.trigger === 'AFTER_APPOINTMENT';
  if (isTimeBased && data.offsetMinutes === 0) {
    return 'Choose how long before or after the appointment this should run.';
  }
  if (data.trigger === 'BEFORE_APPOINTMENT' && data.offsetMinutes > 0) {
    return 'A reminder before the appointment needs a negative offset.';
  }
  if (data.trigger === 'AFTER_APPOINTMENT' && data.offsetMinutes < 0) {
    return 'A follow-up after the appointment needs a positive offset.';
  }
  return null;
}
