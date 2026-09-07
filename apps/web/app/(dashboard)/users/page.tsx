import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { StaffManagementClient } from '../staff/StaffManagementClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
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
    <div className="p-6">
      <StaffManagementClient
        workspaceId={workspace.id}
        initialStaff={serializedStaff as any}
        availableServices={services}
        defaultTimezone={workspace.timezone}
      />
    </div>
  );
}
