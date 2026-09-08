import 'server-only';

/**
 * Notification delivery for the web app.
 *
 * The implementation lives in @bookings/notifications so the standalone
 * workflow worker runs exactly the same code. Two copies would drift, and a
 * reminder sent by the worker would stop matching one sent by the app.
 */
export {
  dispatchBookingNotifications,
  dispatchScheduledWorkflow,
  buildTemplateContext,
  renderTemplate,
  isMailConfigured,
  isSmsConfigured,
  type DispatchSummary,
} from '@bookings/notifications';
