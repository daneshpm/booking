import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { PrismaServiceRepository, GetServicesUseCase, ServiceList } from '@bookings/feature-services';

export const dynamic = 'force-dynamic';

export default async function EventTypesPage() {
  const cookieStore = await cookies();
  const activeSlug = cookieStore.get('active_workspace')?.value;

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

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'rooman',
        slug: 'rooman',
        timezone: 'America/New_York',
        currency: 'USD',
      },
    });
  }

  const repo = new PrismaServiceRepository();
  const getServicesUseCase = new GetServicesUseCase(repo);
  const result = await getServicesUseCase.execute({ workspaceId: workspace.id });
  const services = result.isSuccess ? result.getValue() : [];

  return (
    <div className="p-6">
      <ServiceList workspaceId={workspace.id} initialServices={services} />
    </div>
  );
}
