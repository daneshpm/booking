import * as React from 'react';
import { getStaffPageData } from './getStaffPageData';
import { StaffManagementClient } from './StaffManagementClient';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const { workspace, serializedStaff, services } = await getStaffPageData();

  return (
    <div className="p-6">
      <StaffManagementClient
        workspaceId={workspace.id}
        initialStaff={serializedStaff as any}
        availableServices={services}
        defaultTimezone={workspace.timezone}
      />
    </div>
  );
}
