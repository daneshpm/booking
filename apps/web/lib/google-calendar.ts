import { google, type calendar_v3 } from 'googleapis';
import { logger } from '@bookings/core';

export interface GoogleMeetEventInput {
  summary: string;
  description: string;
  startTime: Date;
  endTime: Date;
  timezone: string;
}

export interface GoogleMeetEventResult {
  meetingLink: string;
  eventId: string;
}

let cachedClient: calendar_v3.Calendar | null = null;
let clientUnavailableReason: string | null = null;

/**
 * Build the Calendar client from the environment.
 *
 * Returns null when any of the three required credentials is unset. The
 * caller falls back to a Jitsi link in that case rather than failing the
 * booking, the same posture email/SMS already take when unconfigured.
 */
function getCalendarClient(): calendar_v3.Calendar | null {
  if (cachedClient) return cachedClient;
  if (clientUnavailableReason) return null;

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    clientUnavailableReason = 'Google Calendar credentials are not configured';
    return null;
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret);
  auth.setCredentials({ refresh_token: refreshToken });

  cachedClient = google.calendar({ version: 'v3', auth });
  return cachedClient;
}

function targetCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || 'primary';
}

/** True when a booking can get a real Google Meet link instead of a Jitsi room. */
export function isGoogleMeetConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CALENDAR_CLIENT_ID &&
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET &&
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN
  );
}

/**
 * Create a real Calendar event with a genuine Google Meet link attached.
 *
 * Never throws — any failure (expired refresh token, quota, network) returns
 * null so the caller can fall back to generateMeetingLink() and the booking
 * still succeeds. No attendees are added: the app's own notification emails
 * already carry the meeting link, so this only needs the link back, not a
 * second, separate invite sent directly from the calendar owner's account.
 */
export async function createGoogleMeetEvent(
  input: GoogleMeetEventInput
): Promise<GoogleMeetEventResult | null> {
  const calendar = getCalendarClient();
  if (!calendar) return null;

  try {
    const response = await calendar.events.insert({
      calendarId: targetCalendarId(),
      conferenceDataVersion: 1,
      sendUpdates: 'none',
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startTime.toISOString(), timeZone: input.timezone },
        end: { dateTime: input.endTime.toISOString(), timeZone: input.timezone },
        conferenceData: {
          createRequest: {
            requestId: `rb-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      },
    });

    const meetingLink =
      response.data.hangoutLink ||
      response.data.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri;

    if (!meetingLink || !response.data.id) return null;

    return { meetingLink, eventId: response.data.id };
  } catch (err) {
    logger.error('Google Calendar event creation failed', { err });
    return null;
  }
}

/** Reset cached client state. Used by tests. */
export function __resetGoogleCalendarForTests(): void {
  cachedClient = null;
  clientUnavailableReason = null;
}
