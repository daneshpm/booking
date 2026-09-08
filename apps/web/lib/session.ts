/**
 * Session helpers for the web app.
 *
 * The implementation lives in @bookings/auth/next so that feature packages
 * shipping their own server actions can apply the same tenant guard. Those
 * actions are public HTTP endpoints once built, so the check has to sit inside
 * the action rather than in the page that renders the form.
 */
export {
  getSession,
  requireSession,
  requireWorkspace,
  requireWorkspaceBySlug,
  startSession,
  endSession,
  toActionError,
  AuthorizationError,
  type AuthSession,
  type SessionWorkspace,
} from '@bookings/auth/next';
