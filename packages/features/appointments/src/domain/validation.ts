export function isValidName(name: string): boolean {
  if (!name) return false;
  const trimmed = name.trim();
  if (trimmed.length < 2) return false;
  if (/^\d+$/.test(trimmed) || !/[a-zA-Z]/.test(trimmed)) {
    return false;
  }
  return true;
}

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
    return target.getTime() >= now.getTime() - 60000;
  }

  return true;
}

