import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { AppointmentsClient, type AppointmentItem } from './AppointmentsClient';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  // The workspace comes from the verified session, never from a client cookie.
  const { workspace } = await requireWorkspace();

  // Fetch workspace bookings, services, staff, and waitlist entries
  const [bookings, services, staffMembers, waitlistEntries] = await Promise.all([
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
    prisma.waitlistEntry.findMany({
      where: { workspaceId: workspace.id },
      include: {
        service: { select: { id: true, name: true, durationMinutes: true, price: true } },
        staff: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const formattedAppointments: AppointmentItem[] = bookings.map((b) => ({
    id: b.id,
    startTime: b.startTime.toISOString(),
    endTime: b.endTime.toISOString(),
    status: b.status as AppointmentItem['status'],
    meetingLink: b.meetingLink,
    customer: {
      id: b.customer?.id || '',
      name: b.customer?.name || 'Unknown Client',
      email: b.customer?.email || '',
      phone: b.customer?.phone || null,
    },
    service: {
      id: b.service?.id || '',
      name: b.service?.name || 'General Service',
      durationMinutes: b.service?.durationMinutes || 30,
      price: b.service?.price ? Number(b.service.price) : 0,
    },
    staff: {
      id: b.staff?.id || '',
      name: b.staff?.name || 'Staff Specialist',
    },
    source: b.source || 'ONLINE',
    selectedAddons: (b.selectedAddons as any) || null,
    intakeResponses: (b.intakeResponses as any) || null,
    manageToken: b.manageToken || null,
  }));

  const formattedWaitlist = waitlistEntries.map((w) => ({
    id: w.id,
    customerName: w.customerName,
    customerEmail: w.customerEmail,
    customerPhone: w.customerPhone,
    preferredDate: w.preferredDate.toISOString().split('T')[0],
    status: w.status as 'WAITING' | 'NOTIFIED' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED',
    notes: w.notes,
    service: {
      id: w.service.id,
      name: w.service.name,
      durationMinutes: w.service.durationMinutes,
      price: w.service.price ? Number(w.service.price) : 0,
    },
    staff: w.staff ? { id: w.staff.id, name: w.staff.name } : null,
    claimToken: w.claimToken,
    notifiedAt: w.notifiedAt ? w.notifiedAt.toISOString() : null,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <AppointmentsClient
      workspaceId={workspace.id}
      workspaceTimezone={workspace.timezone}
      initialAppointments={formattedAppointments}
      initialWaitlist={formattedWaitlist}
      services={services}
      staffMembers={staffMembers}
    />
  );
}
