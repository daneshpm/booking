import { describe, it, expect } from 'vitest';
import {
  isValidPhoneNumber,
  isValidNumericPhone,
  isValidName,
  isFutureDateTime,
} from '../lib/validation';
import { getAvatarBgClass, AVATAR_PRESETS } from '../lib/avatar';

describe('validation utilities', () => {
  describe('isValidPhoneNumber', () => {
    it('accepts standard 10-digit numbers', () => {
      expect(isValidPhoneNumber('9876543210')).toBe(true);
      expect(isValidPhoneNumber('+1 (555) 234-5678')).toBe(true);
      expect(isValidPhoneNumber('+91 98765 43210')).toBe(true);
    });

    it('rejects incomplete numbers like 12345 or 432', () => {
      expect(isValidPhoneNumber('12345')).toBe(false);
      expect(isValidPhoneNumber('432')).toBe(false);
      expect(isValidPhoneNumber('')).toBe(false);
    });

    it('rejects numbers exceeding 15 digits', () => {
      expect(isValidPhoneNumber('1234567890123456')).toBe(false);
    });
  });

  describe('isValidNumericPhone', () => {
    it('accepts valid numeric phone numbers with or without +', () => {
      expect(isValidNumericPhone('9876543210')).toBe(true);
      expect(isValidNumericPhone('+919876543210')).toBe(true);
      expect(isValidNumericPhone('+15552345678')).toBe(true);
      expect(isValidNumericPhone('')).toBe(true); // Optional
    });

    it('rejects non-numeric characters and alphabets', () => {
      expect(isValidNumericPhone('98765abc10')).toBe(false);
      expect(isValidNumericPhone('phone12345')).toBe(false);
      expect(isValidNumericPhone('98765-43210')).toBe(false);
    });

    it('rejects numbers shorter than 10 digits or longer than 15 digits', () => {
      expect(isValidNumericPhone('12345')).toBe(false);
      expect(isValidNumericPhone('1234567890123456')).toBe(false);
    });
  });

  describe('isValidName', () => {
    it('accepts valid human names', () => {
      expect(isValidName('John Doe')).toBe(true);
      expect(isValidName('Emily Watson')).toBe(true);
      expect(isValidName('Danesh')).toBe(true);
    });

    it('rejects numeric-only strings like 12345', () => {
      expect(isValidName('12345')).toBe(false);
      expect(isValidName('0000')).toBe(false);
      expect(isValidName('   ')).toBe(false);
      expect(isValidName('')).toBe(false);
    });
  });

  describe('isFutureDateTime', () => {
    it('returns false for past dates', () => {
      expect(isFutureDateTime('2020-01-01', '10:00')).toBe(false);
    });

    it('returns true for future dates', () => {
      const futureYear = new Date().getFullYear() + 2;
      expect(isFutureDateTime(`${futureYear}-06-15`, '14:00')).toBe(true);
    });
  });

  describe('avatar presets and classes', () => {
    it('resolves preset gradient backgrounds correctly', () => {
      expect(getAvatarBgClass('preset:sunset')).toContain('from-rose-500');
      expect(getAvatarBgClass('preset:emerald')).toContain('from-emerald-600');
      expect(getAvatarBgClass('preset:blue')).toContain('from-blue-600');
      expect(getAvatarBgClass('preset:dark')).toContain('from-slate-900');
      expect(getAvatarBgClass('preset:purple')).toContain('from-[#5c34ad]');
    });

    it('falls back to default purple when preset is unrecognized or null', () => {
      expect(getAvatarBgClass(null)).toContain('from-[#5c34ad]');
      expect(getAvatarBgClass(undefined)).toContain('from-[#5c34ad]');
      expect(getAvatarBgClass('unknown')).toContain('from-[#5c34ad]');
    });
  });
});
