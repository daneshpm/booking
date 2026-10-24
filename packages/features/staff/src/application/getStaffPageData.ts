import { prisma } from '@bookings/database';
import { requireWorkspace } from '@bookings/auth/next';

export async function getStaffPageData() {
  const { workspace } = await requireWorkspace(null, 'ADMIN');

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

  return { workspace, serializedStaff, services };
}
