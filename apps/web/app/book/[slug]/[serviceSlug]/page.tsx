import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@zoho-bookings/database';
import { PrismaServiceRepository } from '@zoho-bookings/feature-services';
import { GetServiceByIdUseCase } from '@zoho-bookings/feature-services';
import { BookingFlowClient } from '../../BookingFlowClient';

export const dynamic = 'force-dynamic';

interface ServiceBookerProps {
  params: Promise<{ slug: string; serviceSlug: string }>;
}

export default async function ServiceBookerPage({ params }: ServiceBookerProps) {
  const { slug, serviceSlug } = await params;

  const workspace = await prisma.workspace.findUnique({
    where: { slug },
  });

  if (!workspace) {
    return notFound();
  }

  const repo = new PrismaServiceRepository();
  const getServiceByIdUseCase = new GetServiceByIdUseCase(repo);
  const result = await getServiceByIdUseCase.execute({
    workspaceId: workspace.id,
    slug: serviceSlug,
  });

  if (result.isFailure) {
    return notFound();
  }

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
}
