import * as React from 'react';
import { requireWorkspace, requireWorkspaceFeature } from '@/lib/session';
import { ExportClient } from './ExportClient';
import { EXPORTABLE_FIELDS } from './fields';

export const dynamic = 'force-dynamic';

export default async function ExportPage() {
  const { workspace } = await requireWorkspace(null, 'ADMIN');
  await requireWorkspaceFeature(workspace, 'dataExport');

  return (
    <ExportClient
      workspaceId={workspace.id}
      fields={EXPORTABLE_FIELDS.map((f) => ({ key: f.key, label: f.label }))}
    />
  );
}
