import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { isMailConfigured } from '@/lib/mailer';
import { WorkflowsClient, type WorkflowItem } from './WorkflowsClient';

export const dynamic = 'force-dynamic';

export default async function WorkflowsPage() {
  const { workspace } = await requireWorkspace();

  const [workflows, recentDeliveries] = await Promise.all([
    prisma.workflow.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.notificationLog.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        recipient: true,
        subject: true,
        status: true,
        error: true,
        createdAt: true,
      },
    }),
  ]);

  const items: WorkflowItem[] = workflows.map((w) => ({
    id: w.id,
    name: w.name,
    description: w.description,
    trigger: w.trigger,
    channel: w.channel,
    recipient: w.recipient,
    offsetMinutes: w.offsetMinutes,
    subject: w.subject,
    body: w.body,
    webhookUrl: w.webhookUrl,
    isActive: w.isActive,
    lastRunAt: w.lastRunAt ? w.lastRunAt.toISOString() : null,
  }));

  return (
    <WorkflowsClient
      workspaceId={workspace.id}
      initialWorkflows={items}
      mailConfigured={isMailConfigured()}
      recentDeliveries={recentDeliveries.map((d) => ({
        id: d.id,
        recipient: d.recipient,
        subject: d.subject,
        status: d.status,
        error: d.error,
        createdAt: d.createdAt.toISOString(),
      }))}
    />
  );
}
