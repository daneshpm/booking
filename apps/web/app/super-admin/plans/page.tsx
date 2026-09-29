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
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <img src="/rooman-logo.png" alt="" className="h-7 w-auto object-contain" />
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest text-[#5c34ad] bg-purple-50 border border-purple-100/80 px-1.5 py-0.5 rounded mb-0.5 hover:bg-purple-100/60 transition-colors"
            >
              <ArrowLeft className="h-3 w-3" />
              Platform Admin
            </Link>
            <h1 className="text-lg font-extrabold text-slate-900 leading-none">Pricing plans</h1>
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
