'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  Users,
  Layers,
  ChevronDown,
  Plus,
  Settings,
  Tag,
  Activity,
  HelpCircle,
  BookOpen,
  CalendarCheck,
  LogOut,
  Zap,
  Menu,
  X,
} from 'lucide-react';
import { SetupWizardModal } from './components/SetupWizardModal';
import { FastPassModal } from './components/FastPassModal';
import { logoutAction } from '../signup/actions';

export interface ShellWorkspace {
  id: string;
  name: string;
  slug: string;
  role: string;
  logoUrl?: string | null;
}

export interface ShellUser {
  name: string;
  email: string;
  avatarUrl?: string | null;
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
  const router = useRouter();
  const [showWorkspaceMenu, setShowWorkspaceMenu] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const [isFastPassOpen, setIsFastPassOpen] = React.useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = React.useState(false);

  // Below the lg breakpoint the sidebar is an off-canvas drawer; close it
  // whenever the route changes so navigating doesn't leave it open over the
  // new page.
  React.useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  // Global Alt+W shortcut to open Fast Pass
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'w' || e.key === 'W')) {
        e.preventDefault();
        setIsFastPassOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute active section label from pathname
  const currentSectionInfo = React.useMemo(() => {
    if (pathname.startsWith('/appointments')) return { title: 'Appointments', icon: CalendarCheck };
    if (pathname.startsWith('/calendar')) return { title: 'Calendar View', icon: Calendar };
    if (pathname.startsWith('/event-types') || pathname.startsWith('/services'))
      return { title: 'Event Types', icon: Tag };
    if (pathname.startsWith('/schedules') || pathname.startsWith('/availability'))
      return { title: 'Schedules & Shifts', icon: Clock };
    if (pathname.startsWith('/workflows'))
      return { title: 'Workflows & Automation', icon: Activity };
    if (pathname.startsWith('/users') || pathname.startsWith('/staff'))
      return { title: 'Team & Staff', icon: Users };
    if (pathname.startsWith('/booking-pages')) return { title: 'Booking Pages', icon: Layers };
    if (pathname.startsWith('/settings')) return { title: 'Workspace Settings', icon: Settings };
    if (pathname.startsWith('/profile')) return { title: 'My Profile', icon: Settings };
    return { title: 'Dashboard', icon: CalendarCheck };
  }, [pathname]);

  const workspaceInitials =
    activeWorkspace.name
      .split(/\s+/)
      .map((word) => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'WS';

  const doneCount = completedSteps.length;
  const CurrentIcon = currentSectionInfo.icon;

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800 font-sans overflow-hidden">
      {/* ---------------------------------------------------- */}
      {/* 1. FULL-HEIGHT STITCHED SIDEBAR                      */}
      {/* ---------------------------------------------------- */}
      {/* Backdrop: only present as an off-canvas drawer below lg */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 max-w-[80vw] border-r border-slate-200/80 bg-white flex flex-col justify-between shrink-0 shadow-[1px_0_6px_rgba(0,0,0,0.02)] transform transition-transform duration-200 ease-out lg:static lg:z-30 lg:w-64 lg:max-w-none lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col">
          {/* Top Brand Header: Stitched seamless branding */}
          <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
            <Link
              href="/appointments"
              className="flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <img
                src="/rooman-logo.png"
                alt="Rooman Technologies"
                className="h-7 w-auto max-w-[135px] object-contain"
              />
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#5c34ad] bg-purple-50 border border-purple-100/80 px-2 py-0.5 rounded-full">
                Portal
              </span>
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(false)}
                aria-label="Close navigation menu"
                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Stitched Workspace Switcher Card */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
              aria-haspopup="menu"
              aria-expanded={showWorkspaceMenu}
              className="w-full bg-slate-50/80 hover:bg-purple-50/40 border border-slate-200/80 hover:border-purple-200/80 rounded-xl p-2.5 flex items-center justify-between cursor-pointer transition-all shadow-2xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {activeWorkspace.logoUrl ? (
                  <img
                    src={activeWorkspace.logoUrl}
                    alt=""
                    className="h-7 w-7 rounded-lg object-cover shrink-0 shadow-2xs border border-slate-200"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[#5c34ad] to-[#7b4bd6] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-2xs uppercase">
                    {workspaceInitials}
                  </div>
                )}
                <div className="text-left min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {activeWorkspace.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium block truncate">
                    {activeWorkspace.role || 'Admin'}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {showWorkspaceMenu && (
              <div className="mt-1.5 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 text-xs animate-in fade-in-50 duration-150">
                <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Workspaces
                </div>
                {workspaces.map((ws) => (
                  <div
                    key={ws.id}
                    className={`px-2.5 py-1.5 rounded-lg flex items-center justify-between ${
                      ws.id === activeWorkspace.id
                        ? 'bg-purple-50 text-purple-900 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                    }`}
                  >
                    <span className="truncate">{ws.name}</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {ws.id === activeWorkspace.id ? 'Current' : ws.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="px-3 space-y-1 mt-1">
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
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#5c34ad] text-white font-bold shadow-sm shadow-[#5c34ad]/20'
                      : 'text-slate-600 hover:bg-slate-100/70 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar: Onboarding Status + Live Links */}
        <div className="p-3 border-t border-slate-100 space-y-2">
          {/* Onboarding card: only rendered when not yet 100% complete */}
          {doneCount < 4 && (
            <button
              type="button"
              onClick={() => setIsSetupOpen(true)}
              className="w-full group bg-slate-50 hover:bg-purple-50/40 border border-slate-200/80 hover:border-purple-200 rounded-xl p-3 shadow-2xs space-y-2 cursor-pointer transition-all text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#5c34ad] animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 tracking-tight">
                    Onboarding Setup
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-[#5c34ad] bg-purple-50 border border-purple-100/80">
                  {doneCount}/4 Done
                </span>
              </div>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300 bg-[#5c34ad]"
                  style={{ width: `${(doneCount / 4) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>Continue configuration</span>
                <span className="text-[#5c34ad] font-semibold group-hover:translate-x-0.5 transition-transform">
                  →
                </span>
              </div>
            </button>
          )}

          {/* Quick Footer Links */}
          <div className="flex items-center justify-between px-2 pt-1 text-[11px] text-slate-500">
            <Link
              href={`/book/${activeWorkspace.slug}`}
              target="_blank"
              className="flex items-center gap-1 hover:text-[#5c34ad] font-medium transition-colors"
            >
              <BookOpen className="h-3 w-3 text-slate-400" />
              <span>Live Portal</span>
            </Link>
            <a
              href="https://www.rooman.com"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-[#5c34ad] font-medium transition-colors"
            >
              <HelpCircle className="h-3 w-3 text-slate-400" />
              <span>Support</span>
            </a>
          </div>

          <div className="px-2 pt-1 text-[10px] text-slate-400 truncate">{user.email}</div>
        </div>
      </aside>

      {/* ---------------------------------------------------- */}
      {/* 2. MAIN COLUMN (TOPBAR + SCROLLABLE CANVAS)          */}
      {/* ---------------------------------------------------- */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header: Stitched directly above the content area */}
        <header className="h-16 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between shrink-0 z-20 shadow-xs gap-2">
          {/* Left: Mobile nav toggle + Breadcrumbs & Layered Section Indicator */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs min-w-0">
            <button
              type="button"
              onClick={() => setIsMobileNavOpen(true)}
              aria-label="Open navigation menu"
              className="h-8 w-8 shrink-0 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </button>
            <span className="hidden sm:inline text-slate-400 font-medium truncate max-w-[120px] sm:max-w-[200px]">
              {activeWorkspace.name}
            </span>
            <span className="hidden sm:inline text-slate-300">/</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-800 font-bold border border-slate-200/60 min-w-0">
              <CurrentIcon className="h-3.5 w-3.5 text-[#5c34ad] shrink-0" />
              <span className="truncate">{currentSectionInfo.title}</span>
            </div>
          </div>

          {/* Right: Actions Strip */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* 10-Second Fast Pass Front-Desk Quick Booker Button */}
            <button
              type="button"
              onClick={() => setIsFastPassOpen(true)}
              className="h-8 px-2 sm:px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm shadow-amber-500/20 hover:shadow-md transition-all cursor-pointer active:scale-95"
              title="10-Sec Fast Pass (Alt+W)"
            >
              <Zap className="h-3.5 w-3.5 fill-current" />
              <span className="hidden sm:inline">Fast Pass</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-black/20 text-[9px] font-mono font-medium">
                Alt+W
              </span>
            </button>

            {/* Quick New Appointment Button */}
            <Link
              href="/appointments?new=true"
              className="h-8 px-2 sm:px-3 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-[#5c34ad]/25 hover:shadow-md transition-all active:scale-95"
              title="New Appointment"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">New</span>
            </Link>

            <div className="h-4 w-px bg-slate-200 mx-0.5 hidden sm:block" />

            {/* Calendar Shortcut */}
            <Link
              href="/calendar"
              title="Calendar View"
              className="hidden sm:flex h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <Calendar className="h-4 w-4" />
            </Link>

            {/* Settings Shortcut */}
            <Link
              href="/settings"
              title="Settings"
              className="h-8 w-8 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-slate-100 flex items-center justify-center text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
            >
              <Settings className="h-4 w-4" />
            </Link>

            {/* Profile Avatar Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                aria-haspopup="menu"
                aria-expanded={showProfileMenu}
                className="h-8 w-8 rounded-xl bg-purple-700 text-white font-bold text-xs flex items-center justify-center shadow-xs hover:ring-2 hover:ring-purple-400/40 transition-all overflow-hidden border border-purple-200/50 cursor-pointer"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : activeWorkspace.logoUrl ? (
                  <img
                    src={activeWorkspace.logoUrl}
                    alt={activeWorkspace.name}
                    className="h-full w-full object-cover rounded-xl"
                  />
                ) : (
                  <span>{user.name ? user.name.charAt(0).toUpperCase() : 'U'}</span>
                )}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 z-50 text-xs animate-in fade-in-50 duration-150">
                  <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2.5">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : activeWorkspace.logoUrl ? (
                      <img
                        src={activeWorkspace.logoUrl}
                        alt={activeWorkspace.name}
                        className="h-8 w-8 rounded-full object-cover shrink-0 border border-slate-200"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-[#5c34ad] text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-bold block text-slate-800 truncate">{user.name}</span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {user.email}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 hover:bg-slate-50 text-slate-700 font-semibold"
                  >
                    My Profile & Account
                  </Link>
                  <Link
                    href={`/book/${activeWorkspace.slug}`}
                    target="_blank"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  >
                    Preview Client Booker
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                  >
                    Workspace Settings
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileMenu(false);
                      setIsSetupOpen(true);
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-slate-50 text-slate-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>Onboarding Checklist</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        doneCount === 4
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-purple-700 bg-purple-50'
                      }`}
                    >
                      {doneCount}/4
                    </span>
                  </button>
                  <form action={logoutAction} className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="submit"
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-rose-600 font-semibold inline-flex items-center gap-2 cursor-pointer"
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

        {/* 3. SCROLLABLE CANVAS WITH LAYERED DEPTH */}
        <main className="flex-1 min-w-0 bg-[#f8fafc] overflow-y-auto">{children}</main>
      </div>

      {/* Global Modals */}
      <SetupWizardModal
        isOpen={isSetupOpen}
        onClose={() => setIsSetupOpen(false)}
        workspaceName={activeWorkspace.name}
        workspaceSlug={activeWorkspace.slug}
        completedSteps={completedSteps}
      />

      <FastPassModal
        workspaceId={activeWorkspace.id}
        isOpen={isFastPassOpen}
        onClose={() => setIsFastPassOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
