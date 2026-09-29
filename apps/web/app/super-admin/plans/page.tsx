import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePlatformAdmin } from '@/lib/session';
import { getPlansAction } from '../actions';
import { PlansClient } from './PlansClient';

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  // Called directly, not through the action below — see the identical
  // comment on the parent /super-admin page for why that distinction matters.
  await requirePlatformAdmin();

  const result = await getPlansAction();
  const plans = result.success ? result.plans : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600 mb-1"
            >
              <ArrowLeft className="h-3 w-3" />
              Platform Admin
            </Link>
            <h1 className="text-lg font-extrabold text-slate-900">Pricing plans</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {!result.success && (
          <div
            role="alert"
            className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm"
          >
            {result.error}
          </div>
        )}

        <p className="text-sm text-slate-500 mb-6 max-w-2xl">
          These are what a prospective organization sees on the public landing page's pricing
          section before they sign up. Assigning an existing organization to a plan is separate —
          see billing status and features on the organization list.
        </p>

        <PlansClient initialPlans={plans} />
      </main>
    </div>
  );
}
