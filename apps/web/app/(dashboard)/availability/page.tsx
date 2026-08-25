import * as React from 'react';
import { prisma } from '@zoho-bookings/database';
import { AvailabilityClient } from './AvailabilityClient';

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
  let workspace = await prisma.workspace.findFirst({
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
        name: 'Acme Advisory & Wellness',
        slug: 'acme-consulting',
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
    <AvailabilityClient
      workspaceId={workspace.id}
      initialStaff={workspace.staff as any}
    />
  );
}
