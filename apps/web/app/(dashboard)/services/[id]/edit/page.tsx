import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import {
  PrismaServiceRepository,
  GetServiceByIdUseCase,
  ServiceForm,
} from '@bookings/feature-services';

export const dynamic = 'force-dynamic';

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = await params;
  const { workspace } = await requireWorkspace(null, 'ADMIN');

  const repo = new PrismaServiceRepository();
  const getServiceByIdUseCase = new GetServiceByIdUseCase(repo);

  // The lookup is scoped to the caller's workspace, so a service id belonging to
  // another tenant resolves to a 404 rather than loading their data.
  const result = await getServiceByIdUseCase.execute({ workspaceId: workspace.id, id });

  if (result.isFailure) {
    return notFound();
  }

  const service = result.getValue();

  const [staff, currentAssignments] = await Promise.all([
    prisma.staff.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' },
    }),
    prisma.serviceStaff.findMany({
      where: { serviceId: id },
      select: { staffId: true },
    }),
  ]);

  const initialAssignedStaffIds = currentAssignments.map((a) => a.staffId);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Edit Service: {service.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Update service duration, pricing, buffer rules, or location details.
        </p>
      </div>

      <ServiceForm
        workspaceId={workspace.id}
        initialData={service}
        isEditing={true}
        availableStaff={staff}
        initialAssignedStaffIds={initialAssignedStaffIds}
      />
    </div>
  );
}

