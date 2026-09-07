import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { BookingPagesClient } from './BookingPagesClient';

export const dynamic = 'force-dynamic';

export default async function BookingPagesPage() {
  const cookieStore = await cookies();
  const activeSlug = cookieStore.get('active_workspace')?.value;

  let workspace = null;
  if (activeSlug) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: activeSlug },
      include: {
        services: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findUnique({
      where: { slug: 'rooman' },
      include: {
        services: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  if (!workspace) {
    workspace = await prisma.workspace.findFirst({
      include: {
        services: {
          where: { isActive: true },
          select: { id: true, name: true, slug: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  return (
    <BookingPagesClient
      workspaceName={workspace?.name || 'rooman'}
      workspaceSlug={workspace?.slug || 'rooman'}
      services={workspace?.services || []}
    />
  );
}
