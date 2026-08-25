import { describe, it, expect } from 'vitest';
import {
  timeStringToMinutes,
  minutesToTimeString,
  createUtcDateFromLocal,
  formatInTimezone,
  doIntervalsOverlap,
  sliceTimeWindowIntoSlots,
} from '../src/time/index.js';

describe('Time and Timezone Engine Utilities', () => {
  it('should parse HH:mm into minutes from midnight', () => {
    expect(timeStringToMinutes('00:00')).toBe(0);
    expect(timeStringToMinutes('09:30')).toBe(570);
    expect(timeStringToMinutes('13:00')).toBe(780);
    expect(timeStringToMinutes('23:59')).toBe(1439);
  });

  it('should format minutes into HH:mm format', () => {
    expect(minutesToTimeString(0)).toBe('00:00');
    expect(minutesToTimeString(570)).toBe('09:30');
    expect(minutesToTimeString(780)).toBe('13:00');
    expect(minutesToTimeString(1439)).toBe('23:59');
  });

  it('should accurately convert local timezone datetime to UTC', () => {
    const utcDate = createUtcDateFromLocal('2026-08-24', '09:00', 'America/New_York');
    // In August (EDT = UTC-4), 09:00 EDT is 13:00 UTC
    expect(utcDate.toISOString()).toBe('2026-08-24T13:00:00.000Z');
  });

  it('should correctly format UTC datetime in target customer timezone', () => {
    const utcDate = new Date('2026-08-24T13:00:00.000Z');
    const formatted = formatInTimezone(utcDate, 'America/New_York', 'hh:mm a');
    expect(formatted).toBe('09:00 AM');
  });

  it('should accurately detect interval overlaps', () => {
    const aStart = new Date('2026-08-24T10:00:00Z');
    const aEnd = new Date('2026-08-24T10:30:00Z');

    // Overlapping interval (10:15 - 10:45)
    const b1Start = new Date('2026-08-24T10:15:00Z');
    const b1End = new Date('2026-08-24T10:45:00Z');
    expect(doIntervalsOverlap(aStart, aEnd, b1Start, b1End)).toBe(true);

    // Contiguous non-overlapping interval (10:30 - 11:00)
    const b2Start = new Date('2026-08-24T10:30:00Z');
    const b2End = new Date('2026-08-24T11:00:00Z');
    expect(doIntervalsOverlap(aStart, aEnd, b2Start, b2End)).toBe(false);

    // Completely disjoint interval (11:00 - 11:30)
    const b3Start = new Date('2026-08-24T11:00:00Z');
    const b3End = new Date('2026-08-24T11:30:00Z');
    expect(doIntervalsOverlap(aStart, aEnd, b3Start, b3End)).toBe(false);
  });

  it('should slice time window into discrete slots', () => {
    const windowStart = new Date('2026-08-24T09:00:00Z');
    const windowEnd = new Date('2026-08-24T11:00:00Z'); // 2 hours = 120 mins
    const slots = sliceTimeWindowIntoSlots(windowStart, windowEnd, 30, 30);

    expect(slots.length).toBe(4);
    expect(slots[0].start.toISOString()).toBe('2026-08-24T09:00:00.000Z');
    expect(slots[0].end.toISOString()).toBe('2026-08-24T09:30:00.000Z');
    expect(slots[3].start.toISOString()).toBe('2026-08-24T10:30:00.000Z');
    expect(slots[3].end.toISOString()).toBe('2026-08-24T11:00:00.000Z');
  });
});
