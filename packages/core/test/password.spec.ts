import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  fakeVerifyPassword,
  MAX_PASSWORD_BYTES,
  MIN_PASSWORD_LENGTH,
} from '../src/password/index';

const GOOD = 'Str0ngPassphrase';

describe('password policy', () => {
  it('accepts a password meeting every rule', () => {
    expect(validatePasswordPolicy(GOOD)).toEqual({ valid: true, errors: [] });
  });

  it('rejects an empty password', () => {
    const result = validatePasswordPolicy('');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Password is required.');
  });

  it('rejects a password shorter than the minimum', () => {
    const result = validatePasswordPolicy('Sh0rt');
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain(`at least ${MIN_PASSWORD_LENGTH}`);
  });

  it('requires mixed case and a digit', () => {
    expect(validatePasswordPolicy('alllowercase1').errors).toContain(
      'Password must contain an uppercase letter.'
    );
    expect(validatePasswordPolicy('ALLUPPERCASE1').errors).toContain(
      'Password must contain a lowercase letter.'
    );
    expect(validatePasswordPolicy('NoDigitsInHere').errors).toContain(
      'Password must contain a number.'
    );
  });

  it('reports every violation at once rather than stopping at the first', () => {
    const result = validatePasswordPolicy('short');
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('rejects passwords longer than bcrypt can actually read', () => {
    // Anything past 72 bytes is ignored by bcrypt, so two different long
    // passwords would otherwise unlock the same account.
    const tooLong = 'A1' + 'a'.repeat(MAX_PASSWORD_BYTES);
    const result = validatePasswordPolicy(tooLong);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain(`at most ${MAX_PASSWORD_BYTES} bytes`);
  });

  it('counts bytes rather than characters for the upper bound', () => {
    // Each emoji is 4 bytes, so 20 of them exceed 72 bytes in only 20 chars.
    const result = validatePasswordPolicy('Aa1' + '😀'.repeat(20));
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('bytes');
  });

  it('rejects common passwords that would otherwise pass the character rules', () => {
    const result = validatePasswordPolicy('Password@123');
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain('too common');
  });
});

describe('password hashing', () => {
  it('produces a bcrypt hash that is not the plaintext', async () => {
    const hash = await hashPassword(GOOD);
    expect(hash).not.toBe(GOOD);
    expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('produces a different hash each time via a random salt', async () => {
    const [a, b] = await Promise.all([hashPassword(GOOD), hashPassword(GOOD)]);
    expect(a).not.toBe(b);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword(GOOD);
    await expect(verifyPassword(GOOD, hash)).resolves.toBe(true);
    await expect(verifyPassword('Wr0ngPassphrase', hash)).resolves.toBe(false);
  });

  it('refuses to hash a password that violates the policy', async () => {
    await expect(hashPassword('weak')).rejects.toThrow();
  });

  it('returns false rather than throwing for a missing or malformed hash', async () => {
    await expect(verifyPassword(GOOD, null)).resolves.toBe(false);
    await expect(verifyPassword(GOOD, '')).resolves.toBe(false);
    await expect(verifyPassword(GOOD, 'not-a-bcrypt-hash')).resolves.toBe(false);
  });

  it('rejects an empty password against a real hash', async () => {
    const hash = await hashPassword(GOOD);
    await expect(verifyPassword('', hash)).resolves.toBe(false);
  });

  it('exposes a decoy verification for the unknown-account path', async () => {
    await expect(fakeVerifyPassword()).resolves.toBe(false);
  });
});
