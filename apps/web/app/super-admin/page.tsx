import Link from 'next/link';
import { Building2, LogOut, Users, Calendar, Tag } from 'lucide-react';
import { requirePlatformAdmin } from '@/lib/session';
import { logoutAction } from '../signup/actions';
import { getOrganizationsAction } from './actions';
import { OrganizationActions, OrganizationStatusBadges } from './OrganizationActions';

export const dynamic = 'force-dynamic';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default async function SuperAdminPage() {
  // Called directly, not through the action below: redirect() throws a
  // Next-internal signal that must reach Next's own machinery unwrapped by
  // any try/catch — see the comment on requirePlatformAdmin() itself, and on
  // getOrganizationsAction's try/catch, for why that distinction matters here.
  const session = await requirePlatformAdmin();

  const result = await getOrganizationsAction();
  const organizations = result.success ? result.organizations : [];

  const totals = organizations.reduce(
    (acc, org) => ({
      workspaces: acc.workspaces + 1,
      members: acc.members + org.memberCount,
      bookings: acc.bookings + org.bookingCount,
    }),
    { workspaces: 0, members: 0, bookings: 0 }
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/rooman-logo.png" alt="" className="h-7 w-auto object-contain" />
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5c34ad] bg-purple-50 border border-purple-100/80 px-1.5 py-0.5 rounded inline-block mb-0.5">
                Platform Admin
              </p>
              <h1 className="text-lg font-extrabold text-slate-900 leading-none">Organizations</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/super-admin/plans"
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-slate-100 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Tag className="h-3.5 w-3.5" />
              Pricing plans
            </Link>
            <div className="h-4 w-px bg-slate-200" />
            <span className="text-xs text-slate-500">{session.user.email}</span>
            <form action={logoutAction}>
              <button
                type="submit"
                title="Sign out"
                className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50/60 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 flex items-center justify-center text-slate-500 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {!result.success && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm"
          >
            {result.error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[#5c34ad] mb-2">
              <div className="h-8 w-8 rounded-lg bg-[#5c34ad]/10 flex items-center justify-center">
                <Building2 className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Organizations
              </span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{totals.workspaces}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[#5c34ad] mb-2">
              <div className="h-8 w-8 rounded-lg bg-[#5c34ad]/10 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Total members
              </span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{totals.members}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-[#5c34ad] mb-2">
              <div className="h-8 w-8 rounded-lg bg-[#5c34ad]/10 flex items-center justify-center">
                <Calendar className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Total bookings
              </span>
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{totals.bookings}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Members</th>
                <th className="px-4 py-3 text-right">Staff</th>
                <th className="px-4 py-3 text-right">Services</th>
                <th className="px-4 py-3 text-right">Bookings</th>
                <th className="px-4 py-3">Last booking</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    No organizations yet.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-900">{org.name}</div>
                      <div className="text-slate-400">{org.slug}</div>
                    </td>
                    <td className="px-4 py-4">
                      <OrganizationStatusBadges
                        isActive={org.isActive}
                        billingStatus={org.billingStatus}
                        trialEndsAt={org.trialEndsAt}
                      />
                    </td>
                    <td className="px-4 py-4 text-slate-600">{org.ownerEmail ?? '—'}</td>
                    <td className="px-4 py-4 text-slate-600">{formatDate(org.createdAt)}</td>
                    <td className="px-4 py-4 text-right text-slate-700">{org.memberCount}</td>
                    <td className="px-4 py-4 text-right text-slate-700">{org.staffCount}</td>
                    <td className="px-4 py-4 text-right text-slate-700">{org.serviceCount}</td>
                    <td className="px-4 py-4 text-right text-slate-700">{org.bookingCount}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {org.lastBookingAt ? formatDate(org.lastBookingAt) : 'None yet'}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <OrganizationActions
                        workspaceId={org.id}
                        workspaceName={org.name}
                        isActive={org.isActive}
                        billingStatus={org.billingStatus}
                        trialEndsAt={org.trialEndsAt}
                        workflowsEnabled={org.workflowsEnabled}
                        analyticsEnabled={org.analyticsEnabled}
                        dataExportEnabled={org.dataExportEnabled}
                        bookingPagesEnabled={org.bookingPagesEnabled}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
