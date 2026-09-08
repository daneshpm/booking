import { describe, it, expect } from 'vitest';
import { dueStartTimeRange, DEFAULT_CATCH_UP_MINUTES } from '../src/scheduler';

/**
 * The window maths behind the reminder sweep.
 *
 * A reminder is due at `booking.startTime + offsetMinutes`. Rearranged, a due
 * moment inside the sweep window maps to a range of booking start times, which
 * is what the query filters on. Getting this wrong either sends reminders at
 * the wrong moment or silently sends none at all.
 */
describe('due start-time range', () => {
  const now = new Date('2026-09-15T12:00:00.000Z');

  it('looks a day ahead for a 24-hour reminder', () => {
    // offset -1440: a booking due for its reminder now starts 24 hours from now.
    const { from, to } = dueStartTimeRange(-1440, now, 60);
    expect(to.toISOString()).toBe('2026-09-16T12:00:00.000Z');
    expect(from.toISOString()).toBe('2026-09-16T11:00:00.000Z');
  });

  it('looks an hour ahead for a 60-minute reminder', () => {
    const { from, to } = dueStartTimeRange(-60, now, 30);
    expect(to.toISOString()).toBe('2026-09-15T13:00:00.000Z');
    expect(from.toISOString()).toBe('2026-09-15T12:30:00.000Z');
  });

  it('looks backwards for a follow-up after the appointment', () => {
    // offset +120: a booking due for follow-up now started two hours ago.
    const { from, to } = dueStartTimeRange(120, now, 60);
    expect(to.toISOString()).toBe('2026-09-15T10:00:00.000Z');
    expect(from.toISOString()).toBe('2026-09-15T09:00:00.000Z');
  });

  it('widens the window by exactly the catch-up allowance', () => {
    const narrow = dueStartTimeRange(-60, now, 15);
    const wide = dueStartTimeRange(-60, now, 120);
    expect(wide.to.getTime()).toBe(narrow.to.getTime());
    expect(narrow.from.getTime() - wide.from.getTime()).toBe(105 * 60_000);
  });

  it('produces a range whose upper bound is the moment the reminder is due', () => {
    // A booking exactly at the boundary is included by the query's `lte`.
    const offset = -1440;
    const { to } = dueStartTimeRange(offset, now, DEFAULT_CATCH_UP_MINUTES);
    const dueMoment = new Date(to.getTime() + offset * 60_000);
    expect(dueMoment.toISOString()).toBe(now.toISOString());
  });

  it('never produces an inverted range', () => {
    for (const offset of [-4320, -1440, -60, -5, 5, 60, 1440, 4320]) {
      const { from, to } = dueStartTimeRange(offset, now, DEFAULT_CATCH_UP_MINUTES);
      expect(from.getTime()).toBeLessThan(to.getTime());
    }
  });

  it('bounds how far back a missed reminder is still sent', () => {
    // After an outage the worker must not deliver a flood of reminders for
    // appointments that have already happened.
    const { from, to } = dueStartTimeRange(-60, now, DEFAULT_CATCH_UP_MINUTES);
    const spanMinutes = (to.getTime() - from.getTime()) / 60_000;
    expect(spanMinutes).toBe(DEFAULT_CATCH_UP_MINUTES);
  });
});
