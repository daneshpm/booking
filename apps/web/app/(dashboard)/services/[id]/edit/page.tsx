import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@bookings/database';
import { PrismaServiceRepository } from '@bookings/feature-services';
import { GetServiceByIdUseCase } from '@bookings/feature-services';
import { ServiceForm } from '@bookings/feature-services';

export const dynamic = 'force-dynamic';

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  const { id } = await params;

  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'acme-consulting' },
    });

    if (!workspace) {
      return notFound();
    }

    const repo = new PrismaServiceRepository();
    const getServiceByIdUseCase = new GetServiceByIdUseCase(repo);
    const result = await getServiceByIdUseCase.execute({
      workspaceId: workspace.id,
      id,
    });

    if (result.isFailure) {
      return notFound();
    }

    const service = result.getValue();

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Edit Service: {service.name}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Update service duration, pricing, buffer rules, or location details.
          </p>
        </div>

        <ServiceForm workspaceId={workspace.id} initialData={service} isEditing={true} />
      </div>
    );
  } catch (err) {
    return notFound();
  }
}
