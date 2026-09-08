export type Role = 'OWNER' | 'ADMIN' | 'STAFF' | 'RECEPTIONIST';

export type BookingStatus =
  'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED';

export type LocationType =
  'ONLINE_MEETING' | 'IN_PERSON_BUSINESS' | 'IN_PERSON_CUSTOMER' | 'PHONE_CALL';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 6 = Saturday

export interface TimeSlot {
  startTime: string; // ISO 8601 UTC string (e.g. 2026-08-24T09:00:00.000Z)
  endTime: string; // ISO 8601 UTC string (e.g. 2026-08-24T09:30:00.000Z)
  formattedTime?: string; // Formatted in customer timezone (e.g. "09:00 AM")
  staffId?: string;
  staffName?: string;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}
