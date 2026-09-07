import * as React from 'react';
import { prisma } from '@bookings/database';
import { AvailabilityClient } from './AvailabilityClient';

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
  let workspace = await prisma.workspace.findFirst({
    where: { slug: 'rooman-technologies' },
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
  }) || await prisma.workspace.findFirst({
    where: { slug: 'acme-consulting' },
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
