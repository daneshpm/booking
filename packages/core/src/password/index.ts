import bcrypt from 'bcryptjs';

/**
 * bcrypt silently ignores every byte past the 72nd. Accepting a longer password
 * would mean two different passwords authenticate the same account, so anything
 * longer is rejected outright rather than quietly truncated.
 */
export const MAX_PASSWORD_BYTES = 72;
export const MIN_PASSWORD_LENGTH = 10;

/** Cost factor. Each increment doubles the work; 12 is the current sane default. */
export const BCRYPT_COST = 12;

/**
 * Passwords that are long enough and varied enough to pass the character rules
 * but are still among the first things an attacker tries.
 */
const DENYLIST = new Set([
  'password123',
  'password1234',
  'passw0rd123',
  'qwerty12345',
  'welcome123',
  'admin12345',
  'letmein123',
  'iloveyou123',
  'password@123',
  'admin@12345',
  'changeme123',
]);

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a plaintext password against the account policy.
 * Returns every failure at once so the UI can show a complete list.
 */
export function validatePasswordPolicy(password: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, errors: ['Password is required.'] };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
  }

  const byteLength = new TextEncoder().encode(password).length;
  if (byteLength > MAX_PASSWORD_BYTES) {
    errors.push(`Password must be at most ${MAX_PASSWORD_BYTES} bytes long.`);
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain a lowercase letter.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number.');
  }

  if (DENYLIST.has(password.toLowerCase())) {
    errors.push('This password is too common. Please choose a different one.');
  }

  return { valid: errors.length === 0, errors };
}

/** Hash a plaintext password. Throws if the password violates the policy. */
export async function hashPassword(password: string): Promise<string> {
  const policy = validatePasswordPolicy(password);
  if (!policy.valid) {
    throw new Error(policy.errors[0]);
  }
  return bcrypt.hash(password, BCRYPT_COST);
}

/**
 * Verify a plaintext password against a stored hash.
 *
 * Never throws: a malformed or empty hash returns false rather than surfacing a
 * different failure mode to the caller, which would leak whether an account row
 * exists.
 */
export async function verifyPassword(password: string, hash: string | null | undefined): Promise<boolean> {
  if (!password || !hash) return false;
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * Burn roughly the same CPU as a real verification.
 *
 * Called on the "no such user" path so that login response times do not reveal
 * which email addresses have accounts.
 */
export async function fakeVerifyPassword(): Promise<false> {
  // A valid bcrypt hash of a value nothing will ever match.
  const decoy = '$2b$12$C6UzMDM.H6dfI/f/IKcEe.7zJ7Zf1Bd7iM3zEXWtHkH2GH1nX0Vhy';
  try {
    await bcrypt.compare('~unmatchable~', decoy);
  } catch {
    /* ignore */
  }
  return false;
}
