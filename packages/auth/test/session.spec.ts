import { describe, it, expect } from 'vitest';
import { generateSessionToken, hashSessionToken, safeCompareDigest } from '../src/session';

describe('session tokens', () => {
  it('generates a URL-safe token with no padding', () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates 32 bytes of entropy', () => {
    // 32 bytes base64url-encodes to 43 characters.
    expect(generateSessionToken()).toHaveLength(43);
  });

  it('never repeats a token', () => {
    const tokens = new Set(Array.from({ length: 500 }, () => generateSessionToken()));
    expect(tokens.size).toBe(500);
  });

  it('hashes to a stable 64-character hex digest', () => {
    const token = generateSessionToken();
    const digest = hashSessionToken(token);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSessionToken(token)).toBe(digest);
  });

  it('produces different digests for different tokens', () => {
    expect(hashSessionToken('token-a')).not.toBe(hashSessionToken('token-b'));
  });

  it('does not store the token itself in the digest', () => {
    // The digest is what reaches the database; it must not contain the secret.
    const token = generateSessionToken();
    expect(hashSessionToken(token)).not.toContain(token);
  });

  it('compares equal digests as equal', () => {
    const digest = hashSessionToken('same');
    expect(safeCompareDigest(digest, digest)).toBe(true);
  });

  it('compares different digests as unequal', () => {
    expect(safeCompareDigest(hashSessionToken('a'), hashSessionToken('b'))).toBe(false);
  });

  it('returns false for mismatched lengths rather than throwing', () => {
    expect(safeCompareDigest('abc', 'abcdef')).toBe(false);
  });
});
