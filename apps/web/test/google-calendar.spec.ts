import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isGoogleMeetConfigured,
  createGoogleMeetEvent,
  __resetGoogleCalendarForTests,
} from '../lib/google-calendar';
import { resolveMeetingLink } from '../lib/meeting-link';

const ENV_KEYS = [
  'GOOGLE_CALENDAR_CLIENT_ID',
  'GOOGLE_CALENDAR_CLIENT_SECRET',
  'GOOGLE_CALENDAR_REFRESH_TOKEN',
  'GOOGLE_CALENDAR_ID',
];

describe('Google Calendar / Meet configuration', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
    __resetGoogleCalendarForTests();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    __resetGoogleCalendarForTests();
  });

  it('reports itself unconfigured with none of the three credentials set', () => {
    expect(isGoogleMeetConfigured()).toBe(false);
  });

  it('reports itself unconfigured when only some credentials are set', () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'client-secret';
    // Refresh token still missing.
    expect(isGoogleMeetConfigured()).toBe(false);
  });

  it('reports itself configured once all three credentials are set', () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'client-id';
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'client-secret';
    process.env.GOOGLE_CALENDAR_REFRESH_TOKEN = 'refresh-token';
    expect(isGoogleMeetConfigured()).toBe(true);
  });

  it('reports null rather than throwing when asked to create an event with no credentials', async () => {
    // A missing/expired Google credential must not break the booking that
    // triggered it — the caller falls back to a Jitsi link instead.
    const result = await createGoogleMeetEvent({
      summary: 'Test',
      description: 'Test',
      startTime: new Date(),
      endTime: new Date(),
      timezone: 'UTC',
    });
    expect(result).toBeNull();
  });

  it('resolveMeetingLink falls back to a working Jitsi link when Google Meet is not configured', async () => {
    const link = await resolveMeetingLink({
      summary: 'Test',
      description: 'Test',
      startTime: new Date(),
      endTime: new Date(),
      timezone: 'UTC',
    });
    expect(() => new URL(link)).not.toThrow();
    expect(link.startsWith('https://')).toBe(true);
  });
});
