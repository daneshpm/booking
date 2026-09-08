import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { BookingPagesClient } from './BookingPagesClient';

export const dynamic = 'force-dynamic';

export default async function BookingPagesPage() {
  const { workspace: access } = await requireWorkspace();

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: access.id },
    include: {
      services: {
        where: { isActive: true },
        select: { id: true, name: true, slug: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return (
    <BookingPagesClient
      workspaceName={workspace.name}
      workspaceSlug={workspace.slug}
      services={workspace.services}
    />
  );
}
