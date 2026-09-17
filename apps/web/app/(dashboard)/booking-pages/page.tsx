import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { BookingPagesClient } from './BookingPagesClient';

export const dynamic = 'force-dynamic';

export default async function BookingPagesPage() {
  const { workspace: access } = await requireWorkspace(null, 'ADMIN');

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: access.id },
    include: {
      services: {
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: 'asc' },
      },
      routingForm: {
        include: { options: { orderBy: { sortOrder: 'asc' } } },
      },
    },
  });

  return (
    <BookingPagesClient
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      workspaceSlug={workspace.slug}
      services={workspace.services}
      branding={{
        brandColor: workspace.brandColor,
        bookingWelcomeTitle: workspace.bookingWelcomeTitle,
        bookingWelcomeMessage: workspace.bookingWelcomeMessage,
      }}
      routingForm={
        workspace.routingForm
          ? {
              question: workspace.routingForm.question,
              isEnabled: workspace.routingForm.isEnabled,
              options: workspace.routingForm.options.map((o) => ({
                serviceId: o.serviceId,
                label: o.label,
              })),
            }
          : null
      }
    />
  );
}
