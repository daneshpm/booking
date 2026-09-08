import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { CalendarBookingsClient, type CalendarBookingItem } from './CalendarBookingsClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const { workspace } = await requireWorkspace();

  const bookings = await prisma.booking.findMany({
    where: { workspaceId: workspace.id },
    include: { customer: true, service: true, staff: true },
    orderBy: { startTime: 'asc' },
  });

  const formattedBookings: CalendarBookingItem[] = bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status as CalendarBookingItem['status'],
    meetingLink: b.meetingLink,
    customer: {
      name: b.customer.name,
      email: b.customer.email,
      phone: b.customer.phone,
    },
    service: {
      name: b.service.name,
      durationMinutes: b.service.durationMinutes,
    },
    staff: {
      name: b.staff.name,
    },
  }));

  return <CalendarBookingsClient initialBookings={formattedBookings} />;
}
