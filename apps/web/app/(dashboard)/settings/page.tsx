import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { SettingsClient } from './SettingsClient';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  // Editing workspace-wide settings is an administrative action.
  const { workspace: access } = await requireWorkspace(null, 'ADMIN');

  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: access.id } });

  return <SettingsClient workspace={workspace} />;
}
