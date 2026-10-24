/**
 * Input validation helpers for staff profiles and avatars.
 */

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return false;
  }
  return /^\+?[0-9\s\-()]{10,25}$/.test(phone.trim());
}

export function isValidNumericPhone(phone: string): boolean {
  if (!phone || !phone.trim()) return true;
  const cleaned = phone.trim().replace(/\s+/g, '');
  return /^\+?[0-9]{10,15}$/.test(cleaned);
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const MAX_IMAGE_DATA_URL_LENGTH = 4_200_000;
const DATA_URL_PATTERN = /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i;
const PRESET_PATTERN = /^preset:[a-z0-9-]{1,40}$/i;

export interface ImageValueResult {
  valid: boolean;
  error?: string;
}

export function validateImageValue(value: string | null | undefined): ImageValueResult {
  if (!value || !value.trim()) return { valid: true };
  const trimmed = value.trim();
  if (PRESET_PATTERN.test(trimmed)) return { valid: true };
  if (trimmed.length > MAX_IMAGE_DATA_URL_LENGTH) {
    return { valid: false, error: 'Image is too large. Maximum size is 3 MB.' };
  }
  const match = trimmed.match(DATA_URL_PATTERN);
  if (!match) {
    return { valid: false, error: 'Image must be a valid data URL or preset.' };
  }
  const mime = match[1].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.includes(mime as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return { valid: false, error: 'Only PNG, JPEG, WebP and GIF images are supported.' };
  }
  return { valid: true };
}
