import * as React from 'react';
import { requireWorkspace } from '@/lib/session';
import { CustomersClient, getWorkspaceCustomers } from '@bookings/feature-customers';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const { workspace } = await requireWorkspace();
  const customers = await getWorkspaceCustomers(workspace.id);

  return <CustomersClient customers={customers} />;
}
