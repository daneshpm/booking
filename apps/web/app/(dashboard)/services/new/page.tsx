import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { ServiceForm } from '@bookings/feature-services';

export const dynamic = 'force-dynamic';

export default async function NewServicePage() {
  const { workspace } = await requireWorkspace(null, 'ADMIN');

  const staff = await prisma.staff.findMany({
    where: { workspaceId: workspace.id, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Create New Service</h1>
        <p className="text-sm text-slate-500 mt-1">
          Define appointment parameters, buffer times, location, and pricing for your new offering.
        </p>
      </div>

      <ServiceForm workspaceId={workspace.id} isEditing={false} availableStaff={staff} />
    </div>
  );
}
