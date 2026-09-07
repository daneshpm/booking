import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { StaffManagementClient } from './StaffManagementClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
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
      where: { slug: 'rooman-technologies' },
    }) || await prisma.workspace.findFirst({
      where: { slug: 'acme-consulting' },
    }) || await prisma.workspace.findFirst({
      orderBy: { createdAt: 'desc' },
    });
  }

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
