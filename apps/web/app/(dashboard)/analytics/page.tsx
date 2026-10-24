import * as React from 'react';
import { requireWorkspace, requireWorkspaceFeature } from '@/lib/session';
import {
  AnalyticsClient,
  getWorkspaceAnalytics,
} from '@bookings/feature-analytics';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const { workspace } = await requireWorkspace(null, 'ADMIN');
  await requireWorkspaceFeature(workspace, 'analytics');

  const data = await getWorkspaceAnalytics(workspace.id, workspace.currency);

  return <AnalyticsClient data={data} />;
}
