import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { AppointmentsClient, type AppointmentItem } from './AppointmentsClient';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  // The workspace comes from the verified session, never from a client cookie.
  const { workspace } = await requireWorkspace();

  // Fetch workspace bookings, services, and staff
  const [bookings, services, staffMembers] = await Promise.all([
    prisma.booking.findMany({
      where: { workspaceId: workspace.id },
      include: {
        customer: true,
        service: true,
        staff: true,
      },
      orderBy: { startTime: 'asc' },
    }),
    prisma.service.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: {
        id: true,
        name: true,
        durationMinutes: true,
      },
      orderBy: { name: 'asc' },
    }),
    prisma.staff.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const formattedAppointments: AppointmentItem[] = bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime,
    endTime: b.endTime,
    status: b.status as AppointmentItem['status'],
    meetingLink: b.meetingLink,
    customer: {
      id: b.customer.id,
      name: b.customer.name,
      email: b.customer.email,
      phone: b.customer.phone,
    },
    service: {
      id: b.service.id,
      name: b.service.name,
      durationMinutes: b.service.durationMinutes,
      price: b.service.price ? Number(b.service.price) : 0,
    },
    staff: {
      id: b.staff.id,
      name: b.staff.name,
    },
  }));

  return (
    <AppointmentsClient
      workspaceId={workspace.id}
      workspaceTimezone={workspace.timezone}
      initialAppointments={formattedAppointments}
      services={services}
      staffMembers={staffMembers}
    />
  );
}
