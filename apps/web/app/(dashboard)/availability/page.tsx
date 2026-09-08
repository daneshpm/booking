import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { AvailabilityClient } from './AvailabilityClient';

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
  const cookieStore = await cookies();
  const activeSlug = cookieStore.get('active_workspace')?.value;

  const staffInclude = {
    staff: {
      include: {
        workingHours: {
          include: { breaks: true },
          orderBy: { dayOfWeek: 'asc' as const },
        },
      },
      orderBy: { name: 'asc' as const },
    },
  };

  let workspace = null;
  if (activeSlug) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: activeSlug },
      include: staffInclude,
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: 'rooman' },
      include: staffInclude,
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      where: { slug: 'rooman-technologies' },
      include: staffInclude,
    }) || await prisma.workspace.findFirst({
      where: { slug: 'acme-consulting' },
      include: staffInclude,
    }) || await prisma.workspace.findFirst({
      orderBy: { createdAt: 'desc' },
      include: staffInclude,
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Rooman Technologies',
        slug: 'rooman-technologies',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
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
    <AvailabilityClient
      workspaceId={workspace.id}
      initialStaff={workspace.staff as any}
    />
  );
}
