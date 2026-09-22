import { describe, it, expect } from 'vitest';
import { isSafeRequestId, MAX_REQUEST_ID_LENGTH } from '../src/index';

/**
 * The correlation id arrives in a request header, so it is attacker-supplied.
 * It is echoed to the caller and stamped onto every log line the request
 * writes, which is why an implausible one is replaced rather than trusted.
 *
 * Production accepted a 3000-character id verbatim before this existed.
 */
describe('upstream request id validation', () => {
  it('accepts the formats real tracing systems emit', () => {
    for (const id of [
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', // UUID
      '4bf92f3577b34da6a3ce929d0e0e4736', // W3C trace id
      'a1b2c3d4e5f6', // nginx $request_id
      'edge_01.us-west:7f3a-9c', // dots, colons, underscores
    ]) {
      expect(isSafeRequestId(id), id).toBe(true);
    }
  });

  it('refuses an id long enough to be a log-amplification payload', () => {
    expect(isSafeRequestId('A'.repeat(MAX_REQUEST_ID_LENGTH))).toBe(true);
    expect(isSafeRequestId('A'.repeat(MAX_REQUEST_ID_LENGTH + 1))).toBe(false);
    expect(isSafeRequestId('A'.repeat(3000))).toBe(false);
  });

  it('refuses whitespace and control characters, which could break a log line', () => {
    for (const id of [
      'abc def',
      'abc\tdef',
      'abc\ndef',
      'abc\r\ndef',
      'abc\u0000def',
      'id\nts=2026-01-01 level=error msg=injected',
    ]) {
      expect(isSafeRequestId(id), JSON.stringify(id)).toBe(false);
    }
  });

  it('refuses characters that do not belong in an identifier', () => {
    const BACKSLASH = String.fromCharCode(92);
    for (const id of [
      'abc/def',
      'abc"def',
      "abc'def",
      `abc${BACKSLASH}def`,
      'abc<script>',
      'a,b',
      'a;b',
    ]) {
      expect(isSafeRequestId(id), id).toBe(false);
    }
  });

  it('refuses an absent or empty id so the caller generates its own', () => {
    expect(isSafeRequestId(null)).toBe(false);
    expect(isSafeRequestId(undefined)).toBe(false);
    expect(isSafeRequestId('')).toBe(false);
  });
});
