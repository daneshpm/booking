import * as React from 'react';
import { prisma } from '@bookings/database';
import { StaffManagementClient } from './StaffManagementClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  let workspace = await prisma.workspace.findFirst({
    where: { slug: 'rooman-technologies' },
  }) || await prisma.workspace.findFirst({
    where: { slug: 'acme-consulting' },
  });

  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: {
        name: 'Rooman Technologies',
        slug: 'rooman-technologies',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      },
    });
  }

  const [staffMembers, services] = await Promise.all([
    prisma.staff.findMany({
      where: { workspaceId: workspace.id },
      include: {
        serviceAssignments: {
          include: {
            service: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
              },
            },
          },
        },
        workingHours: {
          include: {
            breaks: true,
          },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.service.findMany({
      where: { workspaceId: workspace.id, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const serializedStaff = staffMembers.map((m) => ({
    ...m,
    serviceAssignments: m.serviceAssignments.map((sa) => ({
      ...sa,
      priceOverride: sa.priceOverride ? Number(sa.priceOverride) : null,
      service: {
        ...sa.service,
        price: sa.service.price ? Number(sa.service.price) : 0,
      },
    })),
  }));

  return (
    <StaffManagementClient
      workspaceId={workspace.id}
      initialStaff={serializedStaff as any}
      availableServices={services}
      defaultTimezone={workspace.timezone}
    />
  );
}
