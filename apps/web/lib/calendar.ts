/**
 * Universal Calendar Export Utility (RFC 5545 Compliant)
 */

export interface CalendarEventDetails {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizerName?: string;
  organizerEmail?: string;
  uid?: string;
}

/**
 * Format a Date to UTC string for iCal (YYYYMMDDTHHMMSSZ)
 */
function formatToICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Escape text for iCalendar properties according to RFC 5545
 */
function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

/**
 * Generates an RFC 5545 compliant .ics file string
 */
export function generateICSContent(event: CalendarEventDetails): string {
  const uid =
    event.uid || `booking-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@rooman.com`;
  const dtStamp = formatToICSDate(new Date());
  const dtStart = formatToICSDate(event.startTime);
  const dtEnd = formatToICSDate(event.endTime);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rooman Bookings//SME Appointment Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    event.description ? `DESCRIPTION:${escapeICSText(event.description)}` : null,
    event.location ? `LOCATION:${escapeICSText(event.location)}` : null,
    event.organizerName && event.organizerEmail
      ? `ORGANIZER;CN=${escapeICSText(event.organizerName)}:mailto:${event.organizerEmail}`
      : null,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

/**
 * Generates a 1-click Google Calendar Web Add URL
 */
export function generateGoogleCalendarUrl(event: CalendarEventDetails): string {
  const base = 'https://calendar.google.com/calendar/render?action=TEMPLATE';
  const text = encodeURIComponent(event.title);
  const dates = `${formatToICSDate(event.startTime)}/${formatToICSDate(event.endTime)}`;
  let url = `${base}&text=${text}&dates=${dates}`;

  if (event.description) {
    url += `&details=${encodeURIComponent(event.description)}`;
  }
  if (event.location) {
    url += `&location=${encodeURIComponent(event.location)}`;
  }

  return url;
}

/**
 * Generates a 1-click Outlook 365 Web Add URL
 */
export function generateOutlook365Url(event: CalendarEventDetails): string {
  const base =
    'https://outlook.office.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent';
  let url = `${base}&subject=${encodeURIComponent(event.title)}`;
  url += `&startdt=${event.startTime.toISOString()}&enddt=${event.endTime.toISOString()}`;

  if (event.description) {
    url += `&body=${encodeURIComponent(event.description)}`;
  }
  if (event.location) {
    url += `&location=${encodeURIComponent(event.location)}`;
  }

  return url;
}

/**
 * Generates a 1-click Outlook Live / Hotmail Web Add URL
 */
export function generateOutlookLiveUrl(event: CalendarEventDetails): string {
  const base =
    'https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent';
  let url = `${base}&subject=${encodeURIComponent(event.title)}`;
  url += `&startdt=${event.startTime.toISOString()}&enddt=${event.endTime.toISOString()}`;

  if (event.description) {
    url += `&body=${encodeURIComponent(event.description)}`;
  }
  if (event.location) {
    url += `&location=${encodeURIComponent(event.location)}`;
  }

  return url;
}
