'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Briefcase,
  Users,
  Clock,
  Calendar,
  UserCheck,
  Globe,
  Settings,
  ChevronRight,
} from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: 'Services', href: '/services', icon: Briefcase, badge: 'Active' },
    { label: 'Staff & Team', href: '/staff', icon: Users },
    { label: 'Availability', href: '/availability', icon: Clock },
    { label: 'Bookings Calendar', href: '/calendar', icon: Calendar },
    { label: 'Customers', href: '/customers', icon: UserCheck },
    { label: 'Booking Pages', href: '/booking-pages', icon: Globe },
    { label: 'Workspace Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between hidden md:flex shrink-0">
        <div>
          {/* Workspace Branding */}
          <div className="p-5 border-b border-slate-100 dark:border-slate-800/80">
            <Link href="/services" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight block leading-none">
                  Zoho Bookings
                </span>
                <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 mt-1 block">
                  Enterprise Platform
                </span>
              </div>
            </Link>

            <div className="mt-4 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-xs">
                A
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate block">
                  Acme Advisory
                </span>
                <span className="text-[10px] text-slate-500 truncate block">
                  acme-consulting
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Scheduling Operations
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer User Info */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center">
              SJ
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                Sarah Jenkins
              </span>
              <span className="text-[10px] text-slate-400 block truncate">
                owner@acmeconsulting.com
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link href="/services" className="hover:text-slate-900">Workspace</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {pathname === '/services'
                ? 'Services Directory'
                : pathname === '/services/new'
                ? 'Create New Service'
                : pathname.includes('/edit')
                ? 'Edit Service'
                : 'Dashboard'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/book/acme-consulting"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
            >
              <Globe className="h-3.5 w-3.5 text-blue-500" />
              Live Booker Preview
            </Link>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
