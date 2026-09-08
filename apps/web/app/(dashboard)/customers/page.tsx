import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { CustomersClient, type CustomerItem } from './CustomersClient';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const { workspace } = await requireWorkspace();

  const customers = await prisma.customer.findMany({
    where: { workspaceId: workspace.id },
    include: {
      bookings: {
        include: { service: { select: { name: true, durationMinutes: true } } },
        orderBy: { startTime: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const formattedCustomers: CustomerItem[] = customers.map((c) => ({
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

  return <CustomersClient customers={formattedCustomers} />;
}
