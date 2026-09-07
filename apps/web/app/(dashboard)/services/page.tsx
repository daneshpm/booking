import * as React from 'react';
import { prisma } from '@bookings/database';
import { PrismaServiceRepository } from '@bookings/feature-services';
import { GetServicesUseCase } from '@bookings/feature-services';
import { ServiceList } from '@bookings/feature-services';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  try {
    let workspace = await prisma.workspace.findUnique({
      where: { slug: 'acme-consulting' },
    });

    if (!workspace) {
      workspace = await prisma.workspace.create({
        data: {
          name: 'Acme Advisory & Wellness',
          slug: 'acme-consulting',
          timezone: 'America/New_York',
          currency: 'USD',
        },
      });
    }

    const repo = new PrismaServiceRepository();
    const getServicesUseCase = new GetServicesUseCase(repo);
    const result = await getServicesUseCase.execute({ workspaceId: workspace.id });
    const services = result.isSuccess ? result.getValue() : [];

    return <ServiceList workspaceId={workspace.id} initialServices={services} />;
  } catch (err) {
    // Graceful fallback during static build without active DB connection
    return <ServiceList workspaceId="demo-workspace" initialServices={[]} />;
  }
}
