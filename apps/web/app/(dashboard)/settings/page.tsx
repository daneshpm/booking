import * as React from 'react';
import { cookies } from 'next/headers';
import { prisma } from '@bookings/database';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  return <SettingsClient workspace={workspace} />;
}
