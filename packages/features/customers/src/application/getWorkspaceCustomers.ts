import { prisma } from '@bookings/database';
import type { CustomerItem } from '../domain/types';

export async function getWorkspaceCustomers(workspaceId: string): Promise<CustomerItem[]> {
  const customers = await prisma.customer.findMany({
    where: { workspaceId },
    include: {
      bookings: {
        include: { service: { select: { name: true, durationMinutes: true } } },
        orderBy: { startTime: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    notes: c.notes,
    createdAt: c.createdAt,
    bookings: c.bookings.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      meetingLink: b.meetingLink,
      service: b.service
        ? {
            name: b.service.name,
            durationMinutes: b.service.durationMinutes,
          }
        : undefined,
    })),
  }));
}
