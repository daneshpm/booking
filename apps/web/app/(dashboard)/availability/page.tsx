import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { AvailabilityClient } from './AvailabilityClient';

export const dynamic = 'force-dynamic';

export default async function AvailabilityPage() {
  const { workspace: access } = await requireWorkspace(null, 'STAFF');

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: access.id },
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

  return (
    <AvailabilityClient
      workspaceId={workspace.id}
      initialStaff={workspace.staff as any}
    />
  );
}
