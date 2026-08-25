import Link from 'next/link';
import {
  Calendar,
  Briefcase,
  Clock,
  Shield,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Button } from '@zoho-bookings/ui';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Calendar className="h-5 w-5" />
          </div>
          <span className="text-lg font-black tracking-tight text-white">Zoho Bookings</span>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/services">
            <Button variant="primary" className="gap-2 shadow-lg shadow-blue-500/20">
              Open Admin Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-950/60 border border-blue-800 text-blue-300 text-xs font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-blue-400" />
          <span>Architecture Reference: Cal.diy Monorepo + Zoho Bookings Domain</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
          Enterprise Appointment Scheduling{' '}
          <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
            Built From Scratch
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Multi-tenant business scheduling platform featuring domain-driven vertical slices,
          pure availability calculation engine, concurrency race-condition prevention, and public booking portals.
        </p>

        <div className="flex flex-wrap justify-center gap-4 pt-4">
          <Link href="/services">
            <Button size="lg" variant="primary" className="gap-2 shadow-xl shadow-blue-500/25">
              <Briefcase className="h-5 w-5" />
              Manage Services
            </Button>
          </Link>
          <Link href="/book/acme-consulting" target="_blank">
            <Button size="lg" variant="outline" className="gap-2 bg-slate-900 border-slate-700 text-slate-200">
              View Public Booker
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-blue-950 flex items-center justify-center text-blue-400">
              <Briefcase className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Vertical Slice Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every feature module encapsulates pure domain rules, use cases, Prisma repositories, and React components.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Pure Availability Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Timezone-aware slot generation with shift times, lunch breaks, leave overrides, and pre/post buffer intervals.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-purple-950 flex items-center justify-center text-purple-400">
              <Shield className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-white">Concurrency & Idempotency</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Advisory locks, pre-commit validation, and unique client idempotency keys guarantee zero double bookings.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-6 text-center text-xs text-slate-500">
        Zoho Bookings Platform Architecture • Clean Domain-Driven Design
      </footer>
    </div>
  );
}
