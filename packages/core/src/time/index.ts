import { addMinutes, format, parseISO, isBefore, isAfter, isEqual } from 'date-fns';
import { toZonedTime, fromZonedTime, format as formatTz } from 'date-fns-tz';

/**
 * Parses time string in HH:mm format (e.g., "09:30") to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time format: ${timeStr}. Expected HH:mm in 24h format.`);
  }
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight into HH:mm format
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/**
 * Converts a specific date + HH:mm time in a source timezone to a UTC Date object
 */
export function createUtcDateFromLocal(
  dateStr: string, // YYYY-MM-DD
  timeStr: string, // HH:mm
  timezone: string
): Date {
  const localDateTimeStr = `${dateStr}T${timeStr}:00`;
  return fromZonedTime(localDateTimeStr, timezone);
}

/**
 * Formats a UTC date into the desired timezone and pattern
 */
export function formatInTimezone(date: Date, timezone: string, pattern = 'yyyy-MM-dd HH:mm'): string {
  return formatTz(toZonedTime(date, timezone), pattern, { timeZone: timezone });
}

/**
 * Checks if two time intervals [startA, endA] and [startB, endB] overlap
 */
export function doIntervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date
): boolean {
  // Interval overlap condition: startA < endB and endA > startB
  return isBefore(startA, endB) && isAfter(endA, startB);
}

/**
 * Slices a continuous time window into discrete slots of specific duration and step
 */
export function sliceTimeWindowIntoSlots(
  windowStart: Date,
  windowEnd: Date,
  slotDurationMinutes: number,
  stepMinutes: number = slotDurationMinutes
): Array<{ start: Date; end: Date }> {
  const slots: Array<{ start: Date; end: Date }> = [];
  let currentStart = windowStart;

  while (true) {
    const currentEnd = addMinutes(currentStart, slotDurationMinutes);
    if (isAfter(currentEnd, windowEnd)) {
      break;
    }
    slots.push({
      start: currentStart,
      end: currentEnd
    });
    currentStart = addMinutes(currentStart, stepMinutes);
  }

  return slots;
}
