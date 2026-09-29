import * as React from 'react';
import { notFound } from 'next/navigation';
import { prisma } from '@bookings/database';
import { PrismaServiceRepository } from '@bookings/feature-services';
import { GetServiceByIdUseCase } from '@bookings/feature-services';
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

  if (!workspace || !workspace.isActive) {
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

  // Fetch staff assigned to this service, or fall back to all active staff in the workspace
  const serviceStaffRelations = await prisma.serviceStaff.findMany({
    where: { serviceId: service.id, staff: { isActive: true } },
    include: {
      staff: {
        select: {
          id: true,
          name: true,
          headline: true,
          avatarUrl: true,
        },
      },
    },
  });

  let eligibleStaff = serviceStaffRelations.map((r) => r.staff);
  if (eligibleStaff.length === 0) {
    eligibleStaff = await prisma.staff.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: {
        id: true,
        name: true,
        headline: true,
        avatarUrl: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  return (
    <BookingFlowClient
      workspace={{
        id: workspace.id,
        name: workspace.name,
        slug: workspace.slug,
        timezone: workspace.timezone,
      }}
      service={service}
      eligibleStaff={eligibleStaff}
    />
  );
}
