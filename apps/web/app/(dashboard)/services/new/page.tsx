import * as React from 'react';
import { prisma } from '@bookings/database';
import { ServiceForm } from '@bookings/feature-services';

export const dynamic = 'force-dynamic';

export default async function NewServicePage() {
  let workspaceId = 'rooman-technologies-ws';
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: 'rooman-technologies' },
    }) || await prisma.workspace.findUnique({
      where: { slug: 'acme-consulting' },
    });
    if (workspace) workspaceId = workspace.id;
  } catch (err) {
    // Graceful fallback during static build without active DB connection
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Create New Service
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Define appointment parameters, buffer times, location, and pricing for your new offering.
        </p>
      </div>

      <ServiceForm workspaceId={workspaceId} isEditing={false} />
    </div>
  );
}
