import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { AppointmentsClient, type AppointmentItem } from './AppointmentsClient';

export const dynamic = 'force-dynamic';

export default async function AppointmentsPage() {
  const cookieStore = await cookies();
  const activeSlug = cookieStore.get('active_workspace')?.value;

  // Resolve active workspace
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
      orderBy: { createdAt: 'desc' },
    });
  }

  // If no workspace exists in DB, provision a default one
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'rooman',
        slug: 'rooman',
        timezone: 'America/New_York',
        currency: 'USD',
      },
    });

    const category = await prisma.serviceCategory.create({
      data: {
        workspaceId: workspace.id,
        name: 'Consultations',
      },
    });

    const service = await prisma.service.create({
      data: {
        workspaceId: workspace.id,
        categoryId: category.id,
        name: 'Strategy Session',
        slug: 'strategy-session',
        description: 'Comprehensive business and technical strategy session.',
        durationMinutes: 45,
        bufferBeforeMinutes: 15,
        bufferAfterMinutes: 15,
        price: 90.0,
        currency: 'USD',
        locationType: 'ONLINE_MEETING',
        isActive: true,
      },
    });

    const staff = await prisma.staff.create({
      data: {
        workspaceId: workspace.id,
        name: 'Rooman Admin',
        email: 'admin@rooman.com',
        timezone: 'America/New_York',
        isActive: true,
        workingHours: {
          create: [1, 2, 3, 4, 5].map((day) => ({
            dayOfWeek: day,
            startTime: '09:00',
            endTime: '17:00',
            breaks: {
              create: [{ startTime: '13:00', endTime: '14:00' }],
            },
          })),
        },
        serviceAssignments: {
          create: [{ serviceId: service.id }],
        },
      },
    });
  }

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
