import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireSession } from '@/lib/session';
import { DashboardShell } from './DashboardShell';

export const dynamic = 'force-dynamic';

/**
 * Server-side guard for every dashboard route.
 *
 * A visitor without a valid session is redirected before any child page runs,
 * and the workspace identity handed to the UI comes from the verified session
 * rather than from a cookie the browser could edit.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  if (session.workspaces.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">No workspace linked</h1>
          <p className="mt-2 text-xs text-slate-500">
            Your account is not a member of any workspace yet. Ask an administrator to invite you.
          </p>
        </div>
      </div>
    );
  }

  const activeWorkspace = session.workspaces[0];

  // Onboarding progress is derived from what actually exists in the workspace,
  // not from local UI state that resets on reload.
  const [serviceCount, staffWithHoursCount, publishedPageCount] = await Promise.all([
    prisma.service.count({ where: { workspaceId: activeWorkspace.id, isActive: true } }),
    prisma.staff.count({
      where: {
        workspaceId: activeWorkspace.id,
        isActive: true,
        workingHours: { some: {} },
      },
    }),
    prisma.bookingPage.count({ where: { workspaceId: activeWorkspace.id, isPublished: true } }),
  ]);

  // Step ids match the checklist rendered by SetupWizardModal.
  const completedSteps = [
    1, // Business details: the workspace exists, or this layout would not render.
    staffWithHoursCount > 0 ? 2 : 0, // Working hours configured
    serviceCount > 0 ? 3 : 0, // Event types created
    publishedPageCount > 0 ? 4 : 0, // Booking page published
  ].filter((step) => step > 0);

  return (
    <DashboardShell
      user={{ name: session.user.name, email: session.user.email }}
      workspaces={session.workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        slug: w.slug,
        role: w.role,
      }))}
      activeWorkspace={{
        id: activeWorkspace.id,
        name: activeWorkspace.name,
        slug: activeWorkspace.slug,
        role: activeWorkspace.role,
      }}
      completedSteps={completedSteps}
    >
      {children}
    </DashboardShell>
  );
}
