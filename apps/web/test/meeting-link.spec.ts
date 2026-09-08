import { describe, it, expect } from 'vitest';
import { generateMeetingLink } from '../lib/meeting-link';

describe('meeting link generation', () => {
  it('produces an absolute https URL', () => {
    const link = generateMeetingLink();
    expect(() => new URL(link)).not.toThrow();
    expect(link.startsWith('https://')).toBe(true);
  });

  it('never repeats a room', () => {
    const links = new Set(Array.from({ length: 500 }, () => generateMeetingLink()));
    expect(links.size).toBe(500);
  });

  it('produces a room name long enough to resist guessing', () => {
    const room = new URL(generateMeetingLink()).pathname.replace(/^\//, '');
    expect(room.length).toBeGreaterThanOrEqual(12);
  });

  it('uses only URL-safe characters in the room name', () => {
    const room = new URL(generateMeetingLink()).pathname.replace(/^\//, '');
    expect(room).toMatch(/^[A-Za-z0-9-]+$/);
  });
});
