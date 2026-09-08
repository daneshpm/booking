import { describe, it, expect } from 'vitest';
import {
  generateSlots,
  isSlotBookable,
  localTimeToUtc,
  resolveWorkingWindow,
  type GenerateSlotsOptions,
} from '../src/scheduling/index';

const IST = 'Asia/Kolkata';
const NY = 'America/New_York';
const LONG_AGO = new Date('2020-01-01T00:00:00Z');

const WEEKDAY = { startTime: '09:00', endTime: '17:00', breaks: [] };

function opts(overrides: Partial<GenerateSlotsOptions> = {}): GenerateSlotsOptions {
  return {
    date: '2026-09-15',
    timezone: IST,
    window: WEEKDAY,
    durationMinutes: 30,
    now: LONG_AGO,
    ...overrides,
  };
}

const times = (o: GenerateSlotsOptions) => generateSlots(o).map((s) => s.localTime);

describe('resolveWorkingWindow', () => {
  const weekly = {
    startTime: '09:00',
    endTime: '17:00',
    breaks: [{ startTime: '13:00', endTime: '14:00' }],
  };

  it('uses the weekly schedule when there is no override', () => {
    expect(resolveWorkingWindow(weekly)).toEqual(weekly);
  });

  it('returns null when the staff member does not work that day', () => {
    expect(resolveWorkingWindow(null)).toBeNull();
  });

  it('returns null for a leave override', () => {
    expect(
      resolveWorkingWindow(weekly, { isWorking: false, startTime: null, endTime: null })
    ).toBeNull();
  });

  it('returns null for leave even when the override carries hours', () => {
    expect(
      resolveWorkingWindow(weekly, { isWorking: false, startTime: '10:00', endTime: '14:00' })
    ).toBeNull();
  });

  it('replaces the shift and its breaks for a special working day', () => {
    expect(
      resolveWorkingWindow(weekly, { isWorking: true, startTime: '10:00', endTime: '14:00' })
    ).toEqual({ startTime: '10:00', endTime: '14:00', breaks: [] });
  });

  it('falls back to the weekly shift when a working override names no hours', () => {
    // "Working today, normal hours" must not silently produce an empty day.
    expect(
      resolveWorkingWindow(weekly, { isWorking: true, startTime: null, endTime: null })
    ).toEqual(weekly);
  });

  it('returns null for a working override with no hours and no weekly shift', () => {
    expect(
      resolveWorkingWindow(null, { isWorking: true, startTime: null, endTime: null })
    ).toBeNull();
  });
});

describe('localTimeToUtc', () => {
  it('converts a local time to the right instant', () => {
    expect(localTimeToUtc('2026-09-15', '09:30', IST)?.toISOString()).toBe(
      '2026-09-15T04:00:00.000Z'
    );
  });

  it('accounts for daylight saving offsets', () => {
    // 15 July is EDT (UTC-4), 15 January is EST (UTC-5).
    expect(localTimeToUtc('2026-07-15', '09:00', NY)?.toISOString()).toBe(
      '2026-07-15T13:00:00.000Z'
    );
    expect(localTimeToUtc('2026-01-15', '09:00', NY)?.toISOString()).toBe(
      '2026-01-15T14:00:00.000Z'
    );
  });

  it('returns null for a local time that a spring-forward skips', () => {
    // On 8 March 2026 New York jumps 02:00 to 03:00; 02:30 never happens.
    expect(localTimeToUtc('2026-03-08', '02:30', NY)).toBeNull();
  });
});

describe('slot generation', () => {
  it('fills the shift at the default 30-minute step', () => {
    expect(times(opts({ window: { startTime: '09:00', endTime: '11:00', breaks: [] } }))).toEqual([
      '09:00',
      '09:30',
      '10:00',
      '10:30',
    ]);
  });

  it('never runs past the end of the shift', () => {
    const result = times(
      opts({ window: { startTime: '09:00', endTime: '10:00', breaks: [] }, durationMinutes: 45 })
    );
    expect(result).toEqual(['09:00']);
  });

  it('steps by the duration when the service is shorter than 30 minutes', () => {
    expect(
      times(
        opts({ window: { startTime: '09:00', endTime: '10:00', breaks: [] }, durationMinutes: 15 })
      )
    ).toEqual(['09:00', '09:15', '09:30', '09:45']);
  });

  it('skips slots that collide with a break', () => {
    expect(
      times(
        opts({
          window: {
            startTime: '12:00',
            endTime: '15:00',
            breaks: [{ startTime: '13:00', endTime: '14:00' }],
          },
        })
      )
    ).toEqual(['12:00', '12:30', '14:00', '14:30']);
  });

  it('applies buffers before checking collisions', () => {
    const busyStart = localTimeToUtc('2026-09-15', '11:00', IST)!;
    const result = times(
      opts({
        window: { startTime: '09:00', endTime: '13:00', breaks: [] },
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 15,
        busy: [{ start: busyStart, end: new Date(busyStart.getTime() + 30 * 60_000) }],
      })
    );
    // 10:30 ends at 11:00 but its 15-minute wrap-up runs into the booking;
    // 11:30 starts at 11:30 but its 10-minute prep runs back into it.
    expect(result).toEqual(['09:00', '09:30', '10:00', '12:00', '12:30']);
  });

  it('allows a slot that begins exactly when a booking ends', () => {
    const busyStart = localTimeToUtc('2026-09-15', '09:00', IST)!;
    const result = times(
      opts({
        window: { startTime: '09:00', endTime: '11:00', breaks: [] },
        busy: [{ start: busyStart, end: new Date(busyStart.getTime() + 30 * 60_000) }],
      })
    );
    expect(result).toEqual(['09:30', '10:00', '10:30']);
  });

  it('detects a booking that started the previous day and runs past midnight', () => {
    // Minute-of-day arithmetic inverts this interval and misses it entirely,
    // offering a slot the database will then refuse.
    const busy = [
      {
        start: new Date('2026-09-14T18:00:00.000Z'), // 23:30 IST on the 14th
        end: new Date('2026-09-14T19:00:00.000Z'), // 00:30 IST on the 15th
      },
    ];
    const result = times(
      opts({ window: { startTime: '00:00', endTime: '02:00', breaks: [] }, busy })
    );
    expect(result).not.toContain('00:00');
    expect(result).toContain('01:00');
  });

  it('detects a booking that runs to exactly midnight', () => {
    const busy = [
      {
        start: new Date('2026-09-14T18:00:00.000Z'), // 23:30 IST
        end: new Date('2026-09-14T18:30:00.000Z'), // 00:00 IST
      },
    ];
    const result = times(
      opts({ window: { startTime: '00:00', endTime: '01:00', breaks: [] }, busy })
    );
    // Touching midnight exactly does not block the 00:00 slot.
    expect(result).toContain('00:00');
  });

  it('excludes slots in the past and inside the lead time', () => {
    const now = localTimeToUtc('2026-09-15', '09:55', IST)!;
    const result = times(
      opts({ window: { startTime: '09:00', endTime: '11:00', breaks: [] }, now })
    );
    // 09:00 and 09:30 have passed; 10:00 is inside the 10-minute lead time.
    expect(result).toEqual(['10:30']);
  });

  it('respects a custom lead time', () => {
    const now = localTimeToUtc('2026-09-15', '09:00', IST)!;
    const result = times(
      opts({ window: { startTime: '09:00', endTime: '12:00', breaks: [] }, now, leadMinutes: 90 })
    );
    // A 90-minute lead from 09:00 rules out everything up to and including 10:30.
    expect(result).toEqual(['11:00', '11:30']);
  });

  it('returns nothing for a shift that ends before it starts', () => {
    expect(times(opts({ window: { startTime: '17:00', endTime: '09:00', breaks: [] } }))).toEqual(
      []
    );
  });

  it('returns nothing for a non-positive duration', () => {
    expect(times(opts({ durationMinutes: 0 }))).toEqual([]);
  });

  it('labels slots in the workspace timezone', () => {
    const [first] = generateSlots(
      opts({ window: { startTime: '14:00', endTime: '15:00', breaks: [] } })
    );
    expect(first.label).toBe('02:00 PM');
  });
});

describe('daylight saving transitions', () => {
  it('omits the local hour that spring-forward skips', () => {
    const result = times(
      opts({
        date: '2026-03-08',
        timezone: NY,
        window: { startTime: '01:00', endTime: '04:00', breaks: [] },
        durationMinutes: 60,
        stepMinutes: 60,
      })
    );
    // 02:00 does not exist that day in New York.
    expect(result).toEqual(['01:00', '03:00']);
  });

  it('never offers two slots resolving to the same instant', () => {
    const slots = generateSlots(
      opts({
        date: '2026-03-08',
        timezone: NY,
        window: { startTime: '00:00', endTime: '06:00', breaks: [] },
        durationMinutes: 30,
      })
    );
    const instants = slots.map((s) => s.startUtc.getTime());
    expect(new Set(instants).size).toBe(instants.length);
  });

  it('never offers two slots resolving to the same instant on fall-back', () => {
    // 1 November 2026: New York repeats the 01:00 hour.
    const slots = generateSlots(
      opts({
        date: '2026-11-01',
        timezone: NY,
        window: { startTime: '00:00', endTime: '05:00', breaks: [] },
        durationMinutes: 30,
      })
    );
    const instants = slots.map((s) => s.startUtc.getTime());
    expect(new Set(instants).size).toBe(instants.length);
  });
});

describe('isSlotBookable', () => {
  const base = opts({ window: { startTime: '09:00', endTime: '11:00', breaks: [] } });

  it('accepts a start time the engine offers', () => {
    expect(isSlotBookable(localTimeToUtc('2026-09-15', '09:30', IST)!, base)).toBe(true);
  });

  it('rejects a time outside the shift', () => {
    // The exact abuse this guards: a request built by hand rather than by the
    // booking page, asking for the middle of the night.
    expect(isSlotBookable(localTimeToUtc('2026-09-15', '03:00', IST)!, base)).toBe(false);
  });

  it('rejects a time that is not on the slot grid', () => {
    expect(isSlotBookable(localTimeToUtc('2026-09-15', '09:07', IST)!, base)).toBe(false);
  });

  it('rejects any time on a non-working day', () => {
    const closed = { ...base, window: { startTime: '00:00', endTime: '00:00', breaks: [] } };
    expect(isSlotBookable(localTimeToUtc('2026-09-15', '09:30', IST)!, closed)).toBe(false);
  });

  it('rejects a time that falls inside a break', () => {
    const withBreak = {
      ...base,
      window: {
        startTime: '09:00',
        endTime: '15:00',
        breaks: [{ startTime: '13:00', endTime: '14:00' }],
      },
    };
    expect(isSlotBookable(localTimeToUtc('2026-09-15', '13:00', IST)!, withBreak)).toBe(false);
  });

  it('rejects a time already taken', () => {
    const start = localTimeToUtc('2026-09-15', '09:30', IST)!;
    const busy = { ...base, busy: [{ start, end: new Date(start.getTime() + 30 * 60_000) }] };
    expect(isSlotBookable(start, busy)).toBe(false);
  });
});
