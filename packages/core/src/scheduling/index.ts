import { addMinutes } from 'date-fns';
import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { minutesToTimeString, timeStringToMinutes } from '../time/index';

/**
 * Availability engine.
 *
 * Pure and database-free so both the slot listing and booking creation can run
 * the same rules. Two implementations drift; when the one that lists slots and
 * the one that accepts them disagree, customers are offered times that cannot
 * be booked, or worse, times outside working hours are accepted.
 *
 * Everything here works in absolute instants rather than minutes-since-midnight.
 * Minute arithmetic silently breaks on appointments that cross midnight and on
 * daylight-saving transitions, where a local day is not 1440 minutes long.
 */

export interface TimeRange {
  start: Date;
  end: Date;
}

export interface BreakWindow {
  startTime: string; // "13:00"
  endTime: string; // "14:00"
}

export interface WeeklyHours {
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  breaks: BreakWindow[];
}

export interface DateOverride {
  /** false marks leave or a holiday; true marks a special shift. */
  isWorking: boolean;
  startTime: string | null;
  endTime: string | null;
}

export interface WorkingWindow {
  startTime: string;
  endTime: string;
  breaks: BreakWindow[];
}

export interface Slot {
  /** Absolute start of the appointment. */
  startUtc: Date;
  endUtc: Date;
  /** Local wall-clock start in the workspace timezone, "HH:mm". */
  localTime: string;
  /** Human label, for example "09:30 AM". */
  label: string;
}

/** Slots must begin at least this far ahead to be offered. */
export const DEFAULT_LEAD_MINUTES = 10;

/** Default spacing between candidate slots. */
export const DEFAULT_STEP_MINUTES = 30;

/**
 * Decide which hours apply on a given date.
 *
 * An override for the date wins over the weekly schedule. A non-working
 * override means leave, so nothing is bookable. A working override that does
 * not name its own hours falls back to the weekly shift rather than producing
 * an empty day, which is what "working today, normal hours" should mean.
 */
export function resolveWorkingWindow(
  weekly: WeeklyHours | null | undefined,
  override?: DateOverride | null
): WorkingWindow | null {
  if (override) {
    if (!override.isWorking) return null;

    if (override.startTime && override.endTime) {
      // A deliberately different shift replaces the normal one, breaks
      // included: a 10:00-14:00 special shift has no midday break.
      return { startTime: override.startTime, endTime: override.endTime, breaks: [] };
    }

    // Marked working with no hours of its own: use the normal schedule.
    if (!weekly) return null;
    return { startTime: weekly.startTime, endTime: weekly.endTime, breaks: weekly.breaks };
  }

  if (!weekly) return null;
  return { startTime: weekly.startTime, endTime: weekly.endTime, breaks: weekly.breaks };
}

/**
 * Convert a local wall-clock time on a date to an absolute instant.
 *
 * Returns null when that local time does not exist, which happens for the hour
 * skipped by a spring-forward transition. Without this check the conversion
 * silently lands on a different time than the label says, and the customer is
 * booked an hour away from what they picked.
 */
export function localTimeToUtc(date: string, time: string, timezone: string): Date | null {
  const instant = fromZonedTime(`${date}T${time}:00`, timezone);
  if (Number.isNaN(instant.getTime())) return null;

  // Round-trip: if the instant renders back as a different wall-clock time,
  // the requested local time was skipped by a DST transition.
  const roundTrip = formatInTimeZone(instant, timezone, 'HH:mm');
  return roundTrip === time ? instant : null;
}

function overlaps(a: TimeRange, b: TimeRange): boolean {
  // Half-open, matching the database exclusion constraint: touching endpoints
  // do not collide, so back-to-back appointments are allowed.
  return a.start < b.end && a.end > b.start;
}

export interface GenerateSlotsOptions {
  /** Target date as YYYY-MM-DD, read in `timezone`. */
  date: string;
  /** IANA timezone the working hours are expressed in. */
  timezone: string;
  window: WorkingWindow;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  stepMinutes?: number;
  /** Existing appointments as absolute instants. */
  busy?: TimeRange[];
  now?: Date;
  leadMinutes?: number;
}

/**
 * Generate the bookable slots for one staff member on one date.
 *
 * Buffers pad the candidate before collision checks, so a service with a
 * 15-minute wrap-up will not be booked back-to-back against another
 * appointment even though the appointments themselves do not overlap.
 */
export function generateSlots(options: GenerateSlotsOptions): Slot[] {
  const {
    date,
    timezone,
    window,
    durationMinutes,
    bufferBeforeMinutes = 0,
    bufferAfterMinutes = 0,
    busy = [],
    now = new Date(),
    leadMinutes = DEFAULT_LEAD_MINUTES,
  } = options;

  if (durationMinutes <= 0) return [];

  const step = options.stepMinutes ?? Math.min(DEFAULT_STEP_MINUTES, durationMinutes);
  if (step <= 0) return [];

  const shiftStart = timeStringToMinutes(window.startTime);
  const shiftEnd = timeStringToMinutes(window.endTime);
  if (!Number.isFinite(shiftStart) || !Number.isFinite(shiftEnd) || shiftEnd <= shiftStart) {
    return [];
  }

  // Break windows as absolute instants, so the comparison below is the same
  // kind of comparison used for existing bookings.
  const breakRanges: TimeRange[] = [];
  for (const b of window.breaks) {
    const start = localTimeToUtc(date, b.startTime, timezone);
    const end = localTimeToUtc(date, b.endTime, timezone);
    if (start && end && end > start) breakRanges.push({ start, end });
  }

  const earliest = new Date(now.getTime() + leadMinutes * 60_000);
  const slots: Slot[] = [];
  // Keyed by absolute start: a DST fall-back repeats a wall-clock hour, and the
  // same instant must not be offered twice.
  const seen = new Set<number>();

  for (let minute = shiftStart; minute + durationMinutes <= shiftEnd; minute += step) {
    const localTime = minutesToTimeString(minute);
    const startUtc = localTimeToUtc(date, localTime, timezone);
    if (!startUtc) continue; // Local time skipped by a DST transition.

    if (seen.has(startUtc.getTime())) continue;

    const endUtc = addMinutes(startUtc, durationMinutes);
    const padded: TimeRange = {
      start: addMinutes(startUtc, -bufferBeforeMinutes),
      end: addMinutes(endUtc, bufferAfterMinutes),
    };

    if (breakRanges.some((range) => overlaps(padded, range))) continue;
    if (busy.some((range) => overlaps(padded, range))) continue;
    if (startUtc <= earliest) continue;

    seen.add(startUtc.getTime());
    slots.push({
      startUtc,
      endUtc,
      localTime,
      label: formatInTimeZone(startUtc, timezone, 'hh:mm a'),
    });
  }

  return slots.sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());
}

/**
 * Confirm a specific start time is genuinely bookable.
 *
 * Booking creation is a public endpoint, so the times a client sends are not
 * constrained by whatever the booking page displayed. Without this the same
 * request could create an appointment at 3am on a rest day.
 */
export function isSlotBookable(requestedStartUtc: Date, options: GenerateSlotsOptions): boolean {
  const target = requestedStartUtc.getTime();
  return generateSlots(options).some((slot) => slot.startUtc.getTime() === target);
}
