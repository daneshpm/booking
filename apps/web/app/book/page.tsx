import * as React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@bookings/database';

export const dynamic = 'force-dynamic';

/**
 * Directory of publicly bookable workspaces.
 *
 * With exactly one published page this redirects straight to it, which is the
 * common single-tenant deployment. With several it lists them, rather than
 * picking a hardcoded "default" tenant.
 */
export default async function BookRootPage() {
  const pages = await prisma.bookingPage.findMany({
    where: { isPublished: true },
    include: { workspace: { select: { name: true, slug: true } } },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  if (pages.length === 1) {
    redirect(`/book/${pages[0].workspace.slug}`);
  }

  if (pages.length === 0) {
    return (
      <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
        <div className="max-w-md text-center bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">No booking pages available</h1>
          <p className="mt-2 text-xs text-slate-500">
            There are no published booking pages yet. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafbfc] px-6 py-16">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Book an appointment</h1>
        <p className="mt-1 text-sm text-slate-500">Choose an organization to see its services.</p>

        <ul className="mt-8 space-y-3">
          {pages.map((page) => (
            <li key={page.id}>
              <Link
                href={`/book/${page.workspace.slug}`}
                className="block bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 transition-colors shadow-xs"
              >
                <span className="block text-sm font-bold text-slate-900">{page.title}</span>
                {page.description && (
                  <span className="block mt-1 text-xs text-slate-500">{page.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
