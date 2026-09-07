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
  CheckCircle2,
  Plus,
  Bell,
  Settings,
  User,
  Tag,
  Activity,
  Pin,
  MessageSquare,
  Contact,
  HelpCircle,
  BookOpen,
  CalendarCheck,
  Search,
  LogOut,
} from 'lucide-react';
import { SetupWizardModal } from './components/SetupWizardModal';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Read workspace name from cookie or default to 'rooman'
  const [workspaceName, setWorkspaceName] = React.useState('rooman');
  const [workspaceSlug, setWorkspaceSlug] = React.useState('rooman');
  const [workspaceInitials, setWorkspaceInitials] = React.useState('RO');
  const [showWorkspaceMenu, setShowWorkspaceMenu] = React.useState(false);
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [isSetupOpen, setIsSetupOpen] = React.useState(false);
  const [completedSteps, setCompletedSteps] = React.useState<number[]>([1, 3]);

  const toggleSetupStep = (stepId: number) => {
    setCompletedSteps((prev) =>
      prev.includes(stepId) ? prev.filter((id) => id !== stepId) : [...prev, stepId]
    );
  };

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/active_workspace=([^;]+)/);
      if (match && match[1]) {
        const rawSlug = decodeURIComponent(match[1]);
        setWorkspaceSlug(rawSlug);
        const name = rawSlug.replace(/-/g, ' ');
        setWorkspaceName(name);
        const initials = name
          .split(' ')
          .map((n) => n[0])
          .join('')
          .substring(0, 2)
          .toUpperCase();
        setWorkspaceInitials(initials || 'RO');
      }
    }
  }, []);

  const navItems = [
    { label: 'Appointments', href: '/appointments', icon: CalendarCheck },
    { label: 'Event Types', href: '/event-types', icon: Tag },
    { label: 'Schedules', href: '/schedules', icon: Clock },
    { label: 'Workflows', href: '/workflows', icon: Activity },
    { label: 'Users', href: '/users', icon: Users },
    { label: 'Booking Pages', href: '/booking-pages', icon: Layers },
  ];

  return (
    <div className="flex flex-col h-screen bg-white text-slate-800 font-sans overflow-hidden select-none">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER BAR (EXACT ZOHO BOOKINGS LAYOUT)       */}
      {/* ---------------------------------------------------- */}
      <header className="h-12 border-b border-slate-200 bg-white px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Checkmark Circle Logo & Brand */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full border-2 border-[#5c34ad] flex items-center justify-center text-[#5c34ad]">
            <CheckCircle2 className="h-4 w-4 fill-[#5c34ad] text-white" />
          </div>
          <span className="text-base font-bold text-slate-800 tracking-tight">
            Bookings
          </span>
        </div>

        {/* Center / Right: Trial Banner & Icon Actions */}
        <div className="flex items-center gap-4 text-xs">
          {/* Trial Notice */}
          <div className="hidden sm:flex items-center gap-1.5 text-slate-600 text-xs">
            <span>Your trial ends in 1 days.</span>
            <span className="text-[#5c34ad] hover:underline font-semibold cursor-pointer">
              Extend your Trial
            </span>
            <span className="text-slate-300 mx-1">|</span>
            <span className="text-[#5c34ad] hover:underline font-bold cursor-pointer">
              Upgrade now
            </span>
          </div>

          {/* Plus Action Button */}
          <Link
            href="/appointments?new=true"
            className="h-7 w-7 rounded-md bg-[#5c34ad] hover:bg-[#4d2994] text-white flex items-center justify-center shadow-sm transition-all"
            title="New Appointment"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
          </Link>

          {/* Icon Actions */}
          <Link
            href="/appointments?clview=true"
            title="Calendar View"
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Calendar className="h-4 w-4" />
          </Link>

          <button
            type="button"
            title="Notifications"
            className="text-slate-600 hover:text-slate-900 transition-colors relative"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <Link
            href="/settings"
            title="Settings"
            className="text-slate-600 hover:text-slate-900 transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Link>

          {/* User Profile Avatar */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="h-7 w-7 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 font-bold text-xs hover:ring-2 hover:ring-[#5c34ad]/20 transition-all"
            >
              <User className="h-4 w-4 text-slate-600" />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 text-xs">
                <div className="px-4 py-2 border-b border-slate-100">
                  <span className="font-bold block text-slate-800 capitalize">{workspaceName}</span>
                  <span className="text-[11px] text-slate-400 block truncate">admin@{workspaceName.replace(/\s+/g, '')}.com</span>
                </div>
                <Link
                  href="/book/acme-consulting"
                  target="_blank"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Preview Client Booker
                </Link>
                <Link
                  href="/settings"
                  className="block px-4 py-2 hover:bg-slate-50 text-slate-700"
                >
                  Workspace Settings
                </Link>
                <Link
                  href="/signup"
                  className="block px-4 py-2 hover:bg-slate-50 text-rose-600 border-t border-slate-100"
                >
                  Switch / Create Workspace
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 2. MAIN BODY (SIDEBAR + CONTENT AREA)                */}
      {/* ---------------------------------------------------- */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-56 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
          <div>
            {/* Workspace Selector Dropdown */}
            <div className="p-3">
              <div
                onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                className="w-full bg-[#f8f5ff] hover:bg-[#f1ebfc] border border-purple-100 rounded-xl p-2 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-[#e05666] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm uppercase">
                    {workspaceInitials}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate capitalize">
                    {workspaceName}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </div>

              {showWorkspaceMenu && (
                <div className="mt-1 bg-white border border-slate-200 rounded-xl shadow-lg p-1.5 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Workspaces
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowWorkspaceMenu(false)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-900 font-bold capitalize"
                  >
                    {workspaceName} (Current)
                  </button>
                  <Link
                    href="/signup"
                    className="block w-full text-left px-2.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-50 mt-1"
                  >
                    + Add New Workspace
                  </Link>
                </div>
              )}
            </div>

            {/* Sidebar Navigation */}
            <nav className="px-2 space-y-1">
              {navItems.map((item) => {
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
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#5c34ad] text-white font-bold shadow-sm'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Card: Setup Progress (Interactive Stitch-style Onboarding) */}
          <div className="p-3">
            <div
              onClick={() => setIsSetupOpen(true)}
              className="group bg-slate-50 hover:bg-slate-100/90 border border-slate-200 hover:border-slate-300 rounded-xl p-3 shadow-xs space-y-2 cursor-pointer transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-[#5c34ad]" />
                  <span className="text-xs font-bold text-slate-800 tracking-tight">Onboarding Setup</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    completedSteps.length === 4
                      ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                      : 'text-[#5c34ad] bg-purple-50 border border-purple-100/80'
                  }`}
                >
                  {completedSteps.length}/4 Done
                </span>
              </div>
              <div className="w-full bg-slate-200/80 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    completedSteps.length === 4 ? 'bg-emerald-600' : 'bg-[#5c34ad]'
                  }`}
                  style={{ width: `${(completedSteps.length / 4) * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                <span>{completedSteps.length === 4 ? 'Setup fully complete' : 'Continue configuration'}</span>
                <span className="text-[#5c34ad] font-semibold group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Setup Wizard Modal */}
        <SetupWizardModal
          isOpen={isSetupOpen}
          onClose={() => setIsSetupOpen(false)}
          workspaceName={workspaceName}
          workspaceSlug={workspaceSlug}
          completedSteps={completedSteps}
          onToggleStep={toggleSetupStep}
        />

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 bg-white overflow-y-auto">
          {children}
        </main>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 3. BOTTOM HORIZONTAL STRIP (EXACT ZOHO BOTTOM BAR)   */}
      {/* ---------------------------------------------------- */}
      <footer className="h-7 border-t border-slate-200 bg-white px-4 flex items-center justify-between text-[11px] text-slate-500 shrink-0 z-30">
        {/* Left Links */}
        <div className="flex items-center gap-4">
          <button type="button" className="flex items-center gap-1 hover:text-slate-800 transition-colors">
            <Pin className="h-3 w-3 text-slate-400" />
            <span>My Pins</span>
          </button>
          <button type="button" className="flex items-center gap-1 hover:text-slate-800 transition-colors">
            <MessageSquare className="h-3 w-3 text-slate-400" />
            <span>Chats</span>
          </button>
          <button type="button" className="flex items-center gap-1 hover:text-slate-800 transition-colors">
            <Contact className="h-3 w-3 text-slate-400" />
            <span>Contacts</span>
          </button>
        </div>

        {/* Right Links */}
        <div className="flex items-center gap-4">
          <button type="button" className="flex items-center gap-1 text-[#5c34ad] hover:text-[#4a2694] font-semibold transition-colors">
            <HelpCircle className="h-3.5 w-3.5 fill-[#5c34ad] text-white" />
            <span>Help</span>
          </button>
          <button type="button" className="flex items-center gap-1 hover:text-slate-800 transition-colors">
            <BookOpen className="h-3 w-3 text-slate-400" />
            <span>User Guide</span>
          </button>
        </div>
      </footer>
    </div>
  );
}
