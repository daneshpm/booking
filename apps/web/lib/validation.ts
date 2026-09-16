/**
 * Shared input validation helpers across Rooman Bookings.
 */

/**
 * Validates whether a phone number has a valid structure and contains
 * at least 10 digits (supporting international E.164 and domestic formats).
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  // Standard phone numbers must contain between 10 and 15 digits
  if (digits.length < 10 || digits.length > 15) {
    return false;
  }
  // Check for valid characters (+, spaces, hyphens, parentheses, digits)
  return /^\+?[0-9\s\-()]{10,25}$/.test(phone.trim());
}

/**
 * Validates that a person/customer name is not empty, has at least 2 characters,
 * and contains alphabetic characters (rejecting numeric-only strings like "87634").
 */
export function isValidName(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  // Reject pure numeric strings or strings without any alphabetical characters
  if (/^\d+$/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
    return false;
  }
  return true;
}

/**
 * Validates that a given date string (YYYY-MM-DD) and optional time string (HH:MM)
 * represents a moment in the future (or right now).
 */
export function isFutureDateTime(dateStr: string, timeStr?: string): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  if (dateStr < todayStr) {
    return false;
  }

  if (dateStr === todayStr && timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const target = new Date();
    target.setHours(hours, minutes, 0, 0);
    // Allow up to 1 minute grace for immediate submissions
    return target.getTime() >= now.getTime() - 60000;
  }

  return true;
}
