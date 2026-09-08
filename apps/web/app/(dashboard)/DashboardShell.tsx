'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  Layers,
  ChevronDown,
  CheckCircle2,
  Plus,
  Settings,
  User,
  Tag,
  Activity,
  HelpCircle,
  BookOpen,
  CalendarCheck,
  LogOut,
} from 'lucide-react';
import { SetupWizardModal } from './components/SetupWizardModal';
import { logoutAction } from '../signup/actions';

export interface ShellWorkspace {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export interface ShellUser {
  name: string;
  email: string;
}

export interface DashboardShellProps {
  user: ShellUser;
  workspaces: ShellWorkspace[];
  activeWorkspace: ShellWorkspace;
  /** Onboarding steps already satisfied by real workspace data. */
  completedSteps: number[];
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Appointments', href: '/appointments', icon: CalendarCheck },
  { label: 'Event Types', href: '/event-types', icon: Tag },
  { label: 'Schedules', href: '/schedules', icon: Clock },
  { label: 'Workflows', href: '/workflows', icon: Activity },
  { label: 'Users', href: '/users', icon: Users },
  { label: 'Booking Pages', href: '/booking-pages', icon: Layers },
];

export function DashboardShell({
  user,
  workspaces,
  activeWorkspace,
  completedSteps,
  children,
}: DashboardShellProps) {
  const pathname = usePathname();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);

  const workspaceInitials =
    activeWorkspace.name
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'WS';

  const doneCount = completedSteps.length;

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 font-sans overflow-hidden">
      {/* Top header bar */}
      <header className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-[#5c34ad] flex items-center justify-center text-[#5c34ad]">
            <CheckCircle2 className="h-4 w-4 fill-[#5c34ad] text-white" />
          </div>
          <span className="text-base font-bold text-slate-800 tracking-tight">Bookings</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/appointments?new=true"
            className="h-7 w-7 rounded-md bg-[#5c34ad] hover:bg-[#4d2994] text-white flex items-center justify-center shadow-sm transition-all"
            title="New Appointment"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </Link>

          <Link
            href="/calendar"
            title="Calendar View"
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Calendar className="h-4 w-4" />
          </Link>

          <Link
            href="/settings"
            title="Settings"
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-haspopup="menu"
              aria-expanded={showProfileMenu}
              className="h-7 w-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs hover:ring-2 hover:ring-[#5c34ad]/20 transition-all"
            >
              <User className="h-4 w-4 text-slate-600" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="font-bold block text-slate-800 truncate">{user.name}</span>
                  <span className="text-[11px] text-slate-400 block truncate">{user.email}</span>
                </div>
                <Link
                  href={`/book/${activeWorkspace.slug}`}
                  target="_blank"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Preview Client Booker
                </Link>
                <Link href="/settings" className="block px-4 py-2 hover:bg-slate-50 text-slate-700">
                  Workspace Settings
                </Link>
                <form action={logoutAction} className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-rose-600 font-semibold inline-flex items-center gap-2"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Sidebar and content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <aside className="w-56 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
          <div>
            <div className="p-3">
              <button
                type="button"
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                aria-haspopup="menu"
                aria-expanded={showWorkspaceMenu}
                className="w-full bg-[#f8f5ff] hover:bg-[#f1ebfc] border border-purple-100 rounded-xl p-2 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-[#e05666] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm uppercase">
                    {workspaceInitials}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {activeWorkspace.name}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>

              {showWorkspaceMenu && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Workspaces
                  </div>
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      className={`px-2.5 py-1.5 rounded-lg ${
                        ws.id === activeWorkspace.id
                          ? 'bg-purple-50 text-purple-900 font-bold'
                          : 'text-slate-600'
                      }`}
                    >
                      {ws.name}
                      <span className="text-[10px] text-slate-400 ml-1 font-normal">
                        {ws.id === activeWorkspace.id ? '(Current)' : ws.role}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <nav className="px-2 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href === '/appointments' && pathname === '/calendar') ||
                  (item.href === '/event-types' && pathname.startsWith('/services')) ||
                  (item.href === '/schedules' && pathname.startsWith('/availability')) ||
                  (item.href === '/users' && pathname.startsWith('/staff'));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#5c34ad] text-white font-bold shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-3">
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="w-full group bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 rounded-xl p-3 shadow-xs space-y-2 cursor-pointer transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#5c34ad]" />
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    Onboarding Setup
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    doneCount === 4
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : 'text-[#5c34ad] bg-purple-50 border border-purple-100/80'
                  }`}
                >
                  {doneCount}/4 Done
                </span>
              </div>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    doneCount === 4 ? 'bg-emerald-600' : 'bg-[#5c34ad]'
                  }`}
                  style={{ width: `${(doneCount / 4) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>{doneCount === 4 ? 'Setup fully complete' : 'Continue configuration'}</span>
                <span className="text-[#5c34ad] font-semibold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
            </button>
          </div>
        </aside>

        <SetupWizardModal
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
          workspaceName={activeWorkspace.name}
          workspaceSlug={activeWorkspace.slug}
          completedSteps={completedSteps}
        />

        <main className="flex-1 min-w-0 bg-white overflow-y-auto">{children}</main>
      </div>

      <footer className="h-7 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-[11px] text-slate-500 shrink-0 z-30">
        <span className="text-slate-400">
          {activeWorkspace.name} · signed in as {user.email}
        </span>
        <div className="flex items-center gap-4">
          <a
            href="https://www.rooman.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[#5c34ad] hover:text-[#4a2694] font-semibold transition-colors"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Help</span>
          </a>
          <Link
            href="/booking-pages"
            className="flex items-center gap-1 hover:text-slate-800 transition-colors"
          >
            <BookOpen className="h-3 w-3 text-slate-400" />
            <span>Booking Pages</span>
          </Link>
        </div>
      </footer>
    </div>
  );
}
