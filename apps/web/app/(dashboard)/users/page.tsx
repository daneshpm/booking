import * as React from 'react';
import { getStaffPageData } from '../staff/getStaffPageData';
import { StaffManagementClient } from '../staff/StaffManagementClient';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
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
