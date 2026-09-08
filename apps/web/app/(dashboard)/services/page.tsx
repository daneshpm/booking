import * as React from 'react';
import { requireWorkspace } from '@/lib/session';
import {
  PrismaServiceRepository,
  GetServicesUseCase,
  ServiceList,
} from '@bookings/feature-services';

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const { workspace } = await requireWorkspace();

  const repo = new PrismaServiceRepository();
  const getServicesUseCase = new GetServicesUseCase(repo);
  const result = await getServicesUseCase.execute({ workspaceId: workspace.id });
  const services = result.isSuccess ? result.getValue() : [];

  return <ServiceList workspaceId={workspace.id} initialServices={services} />;
}
