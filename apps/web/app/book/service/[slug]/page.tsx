import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@zoho-bookings/database';
import { PrismaServiceRepository } from '@zoho-bookings/feature-services';
import { GetServiceByIdUseCase } from '@zoho-bookings/feature-services';
import { BookingFlowClient } from '../../BookingFlowClient';

export const dynamic = 'force-dynamic';

interface BookerPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ServiceBookerPage({ params }: BookerPageProps) {
  const { slug } = await params;

  try {
    const workspace = await prisma.workspace.findFirst({
      where: { slug: 'acme-consulting' },
    });

    if (!workspace) return notFound();

    const repo = new PrismaServiceRepository();
    const getServiceByIdUseCase = new GetServiceByIdUseCase(repo);
    const result = await getServiceByIdUseCase.execute({
      workspaceId: workspace.id,
      slug,
    });

    if (result.isFailure) return notFound();
    const service = result.getValue();

    return (
      <BookingFlowClient
        workspace={{
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          timezone: workspace.timezone,
        }}
        service={service}
      />
    );
  } catch (err) {
    return notFound();
  }
}
