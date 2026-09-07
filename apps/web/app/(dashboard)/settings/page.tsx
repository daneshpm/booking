import * as React from 'react';
import { prisma } from '@bookings/database';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
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

  return <SettingsClient workspace={workspace} />;
}
