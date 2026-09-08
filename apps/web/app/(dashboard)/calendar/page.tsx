import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { CalendarBookingsClient, type CalendarBookingItem } from './CalendarBookingsClient';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const cookieStore = await cookies();
  const activeSlug = cookieStore.get('active_workspace')?.value;

  let workspace = null;
  if (activeSlug) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: activeSlug },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: 'rooman' },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      where: { slug: 'rooman-technologies' },
    }) || await prisma.workspace.findFirst({
      where: { slug: 'acme-consulting' },
    }) || await prisma.workspace.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

  const bookings = workspace
    ? await prisma.booking.findMany({
        where: { workspaceId: workspace.id },
        include: {
          customer: true,
          service: true,
          staff: true,
        },
        orderBy: { startTime: 'asc' },
      })
    : [];

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
