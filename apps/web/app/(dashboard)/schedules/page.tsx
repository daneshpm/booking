import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { AvailabilityClient } from '../availability/AvailabilityClient';

export const dynamic = 'force-dynamic';

export default async function SchedulesPage() {
  const cookieStore = await cookies();
  const activeSlug = cookieStore.get('active_workspace')?.value;

  let workspace = null;
  if (activeSlug) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: activeSlug },
      include: {
        staff: {
          include: {
            workingHours: {
              include: { breaks: true },
              orderBy: { dayOfWeek: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: 'rooman' },
      include: {
        staff: {
          include: {
            workingHours: {
              include: { breaks: true },
              orderBy: { dayOfWeek: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      include: {
        staff: {
          include: {
            workingHours: {
              include: { breaks: true },
              orderBy: { dayOfWeek: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
      },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'rooman',
        slug: 'rooman',
        timezone: 'America/New_York',
        currency: 'USD',
      },
      include: {
        staff: {
          include: {
            workingHours: {
              include: { breaks: true },
              orderBy: { dayOfWeek: 'asc' },
            },
          },
        },
      },
    });
  }

  return (
    <div className="p-6">
      <AvailabilityClient
        workspaceId={workspace.id}
        initialStaff={workspace.staff as any}
      />
    </div>
  );
}
