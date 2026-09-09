import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { AvailabilityClient } from '../availability/AvailabilityClient';

export const dynamic = 'force-dynamic';

export default async function SchedulesPage() {
  // Saving a schedule requires ADMIN, so the editor is gated the same way
  // rather than rendering a form whose save always fails.
  const { workspace: access } = await requireWorkspace(null, 'ADMIN');

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

  const serializedStaff = workspace.staff.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    timezone: s.timezone,
    isActive: s.isActive,
    workingHours: s.workingHours.map((wh) => ({
      id: wh.id,
      dayOfWeek: wh.dayOfWeek,
      startTime: wh.startTime,
      endTime: wh.endTime,
      breaks: wh.breaks.map((b) => ({
        id: b.id,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    })),
  }));

  return (
    <div className="p-6">
      <AvailabilityClient workspaceId={workspace.id} initialStaff={serializedStaff} />
    </div>
  );
}
