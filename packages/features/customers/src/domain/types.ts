export interface CustomerBooking {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  meetingLink?: string | null;
  service?: {
    name: string;
    durationMinutes: number;
  };
}

export interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  bookings: CustomerBooking[];
}
