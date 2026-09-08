export {
  sendMail,
  isMailConfigured,
  getFromAddress,
  __resetMailerForTests,
  type MailMessage,
  type MailResult,
} from './channels/email';

export {
  sendSms,
  isSmsConfigured,
  isValidPhoneNumber,
  truncateForSms,
  MAX_SMS_LENGTH,
  type SmsMessage,
} from './channels/sms';

export {
  sendWebhook,
  assertDeliverableTarget,
  isBlockedAddress,
  signPayload,
  verifySignature,
  WebhookTargetError,
  type WebhookPayload,
} from './channels/webhook';

export { type DeliveryResult } from './channels/types';

export {
  buildTemplateContext,
  defaultMessage,
  recipientsFor,
  renderTemplate,
  type BookingTemplateSource,
  type RenderedMessage,
} from './templates';

export {
  dispatchBookingNotifications,
  dispatchScheduledWorkflow,
  type DispatchSummary,
} from './dispatch';

export {
  runScheduledWorkflows,
  countExpiredReminders,
  dueStartTimeRange,
  DEFAULT_CATCH_UP_MINUTES,
  type SweepOptions,
  type SweepSummary,
} from './scheduler';
