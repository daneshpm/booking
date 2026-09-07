'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Shield,
  CheckCircle2,
  Video,
  DollarSign,
  Users,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  ExternalLink,
  Zap,
  Lock,
  Bell,
  Layers,
  Smartphone,
  CalendarCheck,
  Briefcase,
  HeartHandshake,
  GraduationCap,
  Building2,
  Sliders,
  RefreshCw,
} from 'lucide-react';
import { Button, Badge } from '@bookings/ui';

export function ApexLandingPage() {
  // Tabs for "Here's How It Works"
  const [activeTab, setActiveTab] = React.useState<'CLIENTS' | 'TEAM'>('CLIENTS');

  // Pricing billing period: monthly or yearly (save 20%)
  const [annualBilling, setAnnualBilling] = React.useState(true);

  // Interactive scheduler preview state
  const [demoSelectedDay, setDemoSelectedDay] = React.useState('Mon, Sep 14');
  const [demoSelectedTime, setDemoSelectedTime] = React.useState('10:00 AM');
  const [demoBooked, setDemoBooked] = React.useState(false);

  // FAQ accordion state
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleDemoSlotClick = (time: string) => {
    setDemoSelectedTime(time);
    setDemoBooked(true);
    setTimeout(() => setDemoBooked(false), 3500);
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* ---------------------------------------------------- */}
      {/* 1. ANNOUNCEMENT TOP BANNER                           */}
      {/* ---------------------------------------------------- */}
      <div className="bg-indigo-50/90 border-b border-indigo-100 text-xs text-indigo-950 py-2 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          <span className="font-bold text-indigo-900">ApexBookings 2.0:</span>
          <span className="text-indigo-800/90 font-medium">PostgreSQL concurrency locks, timezone intelligence & automated video meetings.</span>
          <Link
            href="/book/acme-consulting"
            className="text-indigo-600 hover:text-indigo-800 font-bold underline ml-1 inline-flex items-center gap-1"
          >
            <span>Explore Live Demo</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. STICKY PRODUCT HEADER                            */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-xl border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-slate-900">
                    Apex<span className="text-indigo-600">Bookings</span>
                  </span>
                  <Badge variant="info" className="text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200">
                    Enterprise
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                  Appointment Scheduling Platform
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <a href="#features" className="hover:text-slate-900 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#solutions" className="hover:text-slate-900 transition-colors">
                Solutions
              </a>
              <a href="#live-demo" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
                <span>Live Sandbox</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <a href="#faq" className="hover:text-slate-900 transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <button
                type="button"
                className="px-3.5 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all"
              >
                Sign In
              </button>
            </Link>

            <Link href="/appointments">
              <button
                type="button"
                className="px-3.5 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 rounded-xl hover:bg-indigo-50 transition-all"
              >
                Dashboard
              </button>
            </Link>

            <Link href="/signup">
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 px-4 py-2 rounded-xl transition-all"
              >
                START FREE TRIAL
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 3. HERO SECTION (INSPIRED BY TOP BOOKING SAAS)       */}
      {/* ---------------------------------------------------- */}
      <section className="relative pt-16 pb-20 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-white via-slate-50/60 to-[#fafbfc]">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Messaging */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Layers className="h-3.5 w-3.5 text-indigo-600" />
              <span>Multi-Tenant Scheduling Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Automate appointments.{' '}
              <span className="bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 bg-clip-text text-transparent">
                Protect your team&apos;s focus.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-normal">
              ApexBookings replaces messy email chains with frictionless client booking portals.
              Powered by pure timezone-aware availability, automatic buffer protection, staff shifts,
              and concurrency locks to guarantee zero double-bookings.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm px-6 py-3.5 shadow-lg shadow-indigo-600/25 rounded-xl transition-all"
                >
                  START FREE TRIAL
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>

              <Link
                href="/appointments"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:text-slate-900 font-bold text-xs transition-all shadow-xs"
              >
                <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                <span>Open Appointments Dashboard</span>
              </Link>

              <Link
                href="/book/acme-consulting"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 px-3 py-2 transition-colors"
              >
                <span>Preview Client Booker</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Zero double-booking guarantee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Auto Google Meet & Zoom links</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Intelligent prep & wrap buffers</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Scheduler Preview Widget */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl bg-white border border-slate-200 shadow-xl shadow-slate-200/60 p-6">
              {/* Host Profile */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-base shadow-sm">
                      SJ
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Sarah Jenkins</h2>
                    <span className="text-xs text-slate-500 block">Principal Advisory Consultant</span>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                  Accepting Clients
                </Badge>
              </div>

              {/* Service Details */}
              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 text-sm">Initial Strategy Consultation</span>
                  <span className="font-extrabold text-emerald-600 text-sm">$85.00</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-600" />
                    <span>45 mins</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-purple-600" />
                    <span>Google Meet Video</span>
                  </div>
                </div>
              </div>

              {/* Interactive Day Selector */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Select Date (New York EDT)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['Mon, Sep 14', 'Tue, Sep 15', 'Wed, Sep 16'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDemoSelectedDay(day)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                        demoSelectedDay === day
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm scale-[1.02]'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clickable Open Time Slots */}
              <div className="pt-4">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Available Slots
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['09:00 AM', '10:00 AM', '11:15 AM', '02:00 PM'].map((time) => {
                    const isSelected = demoSelectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleDemoSlotClick(time)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50/70 hover:text-indigo-700 hover:border-indigo-300'
                        }`}
                      >
                        <span>{time}</span>
                        <ArrowRight className="h-3 w-3 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Instant Feedback Toast */}
              {demoBooked && (
                <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    Selected {demoSelectedDay} at {demoSelectedTime}!
                  </span>
                </div>
              )}

              {/* Buffer & Real Booking Link */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                  <Shield className="h-3.5 w-3.5" />
                  <span>15m Prep/Wrap Buffer Auto-Protected</span>
                </div>
                <Link
                  href="/book/acme-consulting"
                  className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                >
                  <span>Book Real Slot</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. KEY METRICS & PROOF BAR                           */}
      {/* ---------------------------------------------------- */}
      <section className="py-14 border-y border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <p className="text-center text-xs font-bold tracking-wider text-slate-500 uppercase mb-8">
            Engineered for high-performing advisory practices, clinics, and professional firms
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 block">100%</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Pure Concurrency Protection
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 block">85%</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Reduction in No-Shows
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 block">99.99%</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Availability Engine SLA
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 block">0ms</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Scheduling Double-Bookings
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. "HERE'S HOW APEXBOOKINGS WORKS" (INTERACTIVE)     */}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto text-center space-y-12">
        <div>
          <Badge variant="info" className="text-xs px-3 py-1 font-bold uppercase tracking-wider mb-3 bg-indigo-50 text-indigo-700 border-indigo-200">
            Streamlined 3-Step Flow
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Here&apos;s how <span className="text-indigo-600">ApexBookings</span> works
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mt-3">
            Designed for an effortless client booking experience and airtight calendar control for your team.
          </p>

          {/* Perspective Tab Buttons */}
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200 mt-8">
            <button
              type="button"
              onClick={() => setActiveTab('CLIENTS')}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'CLIENTS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              For your clients
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TEAM')}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'TEAM'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              For you & your team
            </button>
          </div>
        </div>

        {/* Tab 1: For Clients */}
        {activeTab === 'CLIENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 01
              </span>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Pick a convenient time slot</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Clients pick their preferred meeting time in seconds. Available slots automatically adapt
                to their local timezone with zero confusion.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 02
              </span>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Fill in booking details</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Clients share intake details, contact information, and meeting goals to help your team prepare
                before the conversation begins.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 03
              </span>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Instant confirmation & meeting link</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Both parties receive instant confirmations, auto-generated Google Meet video links, and automated
                reminders so no one forgets.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: For Team */}
        {activeTab === 'TEAM' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 01
              </span>
              <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Configure services & pricing</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Set up consultations, discovery calls, reviews, and team sessions with custom durations, locations,
                and pricing tiers.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 02
              </span>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Define shifts & buffers</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Set weekly staff hours, lunch breaks, holiday leaves, and prep/wrap-up buffers to protect your team
                from meeting exhaustion.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 03
              </span>
              <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Appointments on autopilot</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Confirmed bookings appear immediately on your admin calendar. Easily mark completed, reschedule,
                or cancel with live database updates.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. SIX CORE PLATFORM PILLARS                         */}
      {/* ---------------------------------------------------- */}
      <section id="features" className="py-24 px-4 sm:px-8 bg-slate-50/80 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <Badge variant="warning" className="text-xs px-3 py-1 font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200">
              Core Architecture
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Built for speed, accuracy, and operational scale
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
              Engineered with clean domain-driven architecture, PostgreSQL concurrency checks, and responsive design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {/* 1. Concurrency Protection */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-indigo-300 shadow-sm hover:shadow-md transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Concurrency Race-Condition Locks</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Unique idempotency keys and pre-commit interval collision validation guarantee zero double-bookings,
                even when multiple clients book simultaneously.
              </p>
            </div>

            {/* 2. Buffer Times & Shift Management */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-purple-300 shadow-sm hover:shadow-md transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-105 transition-transform">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Buffer Zones & Break Protection</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically pad meetings with prep and wrap-up buffers (e.g. 15 mins). Enforce staff lunch breaks
                and custom holiday leave overrides.
              </p>
            </div>

            {/* 3. Real-Time Slot Engine */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-105 transition-transform">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Dynamic Slot Generation</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Our mathematical availability engine computes open slots on the fly from staff schedules,
                filtering out past times and existing bookings in real time.
              </p>
            </div>

            {/* 4. Automated Video Conferencing */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-cyan-300 shadow-sm hover:shadow-md transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-105 transition-transform">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated Video Meetings</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatically generates unique Google Meet or video conferencing links for every online consultation,
                displayed right on the calendar.
              </p>
            </div>

            {/* 5. Multi-Staff & Round Robin */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-emerald-300 shadow-sm hover:shadow-md transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Staff Team Management</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Assign specific services to individual specialists or pool team availability. Clients can select
                their preferred advisor with ease.
              </p>
            </div>

            {/* 6. Admin Control & Audit Logs */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200 hover:border-rose-300 shadow-sm hover:shadow-md transition-all space-y-3 group">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition-transform">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Admin Calendar & Full Audit Logs</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Review appointments by status, mark as completed, cancel, or reschedule. Every action is recorded
                in immutable PostgreSQL audit logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 7. INDUSTRY SOLUTIONS SECTION                        */}
      {/* ---------------------------------------------------- */}
      <section id="solutions" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <Badge variant="purple" className="text-xs px-3 py-1 font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-200">
            Tailored Solutions
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Built for service professionals and teams
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Whether you&apos;re a boutique consultancy, medical clinic, or advisory practice, ApexBookings fits your flow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <Briefcase className="h-7 w-7 text-indigo-600" />
            <h4 className="text-base font-bold text-slate-900">Consulting & Advisory</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Paid client advisory sessions, discovery interviews, and contract strategy meetings with Google Meet.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <HeartHandshake className="h-7 w-7 text-rose-600" />
            <h4 className="text-base font-bold text-slate-900">Healthcare & Therapy</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Patient telehealth appointments, multi-specialist shift coverage, and buffer-protected clinical sessions.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-rose-600 hover:text-rose-800 inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <GraduationCap className="h-7 w-7 text-amber-600" />
            <h4 className="text-base font-bold text-slate-900">Coaching & Education</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Executive coaching sprints, student office hours, recurring curriculum reviews, and intake questionnaires.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-amber-600 hover:text-amber-800 inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <Building2 className="h-7 w-7 text-purple-600" />
            <h4 className="text-base font-bold text-slate-900">Financial & Corporate</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Quarterly tax reviews, investment consultations, and high-security client scheduling with full audit trails.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-purple-600 hover:text-purple-800 inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 8. INTERACTIVE LIVE BOOKING SANDBOX                  */}
      {/* ---------------------------------------------------- */}
      <section id="live-demo" className="py-20 px-4 sm:px-8 bg-slate-50/60 border-y border-slate-200/80">
        <div className="max-w-5xl mx-auto rounded-3xl bg-white border border-slate-200 p-8 md:p-12 shadow-xl shadow-slate-200/40 text-center space-y-8">
          <Badge variant="info" className="text-xs px-3 py-1 font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200">
            Experience It Live
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Try the real booking engine in your browser right now
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Book an appointment slot on our demo workspace. Watch how staff shifts, lunch breaks, and buffer times
            are calculated live from PostgreSQL with zero mock delays.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link href="/book/acme-consulting">
              <Button
                size="lg"
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm px-8 py-4 shadow-lg shadow-indigo-600/25 rounded-xl transition-all"
              >
                Launch Client Booking Portal
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <Link href="/calendar">
              <Button
                size="lg"
                variant="outline"
                className="bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:text-slate-900 font-bold text-sm px-8 py-4 rounded-xl shadow-xs"
              >
                View Admin Calendar
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 9. TRANSPARENT PRICING SECTION                       */}
      {/* ---------------------------------------------------- */}
      <section id="pricing" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-16 text-center">
        <div className="space-y-4">
          <Badge variant="success" className="text-xs px-3 py-1 font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">
            Simple Pricing
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Transparent plans for solo advisors and growing teams
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            Everything you need with zero hidden charges. Upgrade as your team and client volume expands.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold mt-4">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={`px-4 py-2 rounded-xl transition-all ${
                !annualBilling ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                annualBilling ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Annual Billing</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold uppercase ${
                annualBilling ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left items-stretch">
          {/* Plan 1: Free Forever */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Starter</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">$0</span>
                <span className="text-xs text-slate-500 font-semibold">/ forever</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Great for solo practitioners and independent specialists starting out.
              </p>

              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>1 Staff Member profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Unlimited client appointments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Google Meet video generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Admin calendar & customers list</span>
                </div>
              </div>
            </div>

            <Link href="/book/acme-consulting" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
              >
                Start Free
              </button>
            </Link>
          </div>

          {/* Plan 2: Professional (Most Popular) */}
          <div className="p-8 rounded-3xl bg-white border-2 border-indigo-600 flex flex-col justify-between space-y-6 relative shadow-xl shadow-indigo-600/10">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
              MOST POPULAR
            </span>

            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Professional</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">{annualBilling ? '$12' : '$15'}</span>
                <span className="text-xs text-slate-500 font-semibold">/ staff / mo</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                For growing practices that need buffer protection, multi-staff scheduling, and payments.
              </p>

              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Up to 10 Staff Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Intelligent Prep & Wrap Buffers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Custom Staff Shifts & Holiday Overrides</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Online Payments & Deposits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Full Audit Logs & Concurrency Safety</span>
                </div>
              </div>
            </div>

            <Link href="/book/acme-consulting" className="w-full">
              <button
                type="button"
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-md shadow-indigo-600/25 transition-all"
              >
                GET STARTED TODAY
              </button>
            </Link>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Enterprise</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">{annualBilling ? '$24' : '$29'}</span>
                <span className="text-xs text-slate-500 font-semibold">/ staff / mo</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                For organizations requiring unlimited multi-tenant workspaces, SLA, and custom domain white-labeling.
              </p>

              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Unlimited Staff & Workspaces</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Custom Domain & Brand White-Label</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Round-Robin Team Distribution</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Priority 24/7 Dedicated Support & SLA</span>
                </div>
              </div>
            </div>

            <Link href="/book/acme-consulting" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
              >
                Contact Enterprise
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 10. INTERACTIVE FAQ ACCORDION                        */}
      {/* ---------------------------------------------------- */}
      <section id="faq" className="py-24 px-4 sm:px-8 max-w-4xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <Badge variant="default" className="text-xs px-3 py-1 font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border-slate-200">
            Got Questions?
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Learn more about concurrency locks, buffer intervals, and client scheduling.
          </p>
        </div>

        <div className="space-y-4 text-left">
          {[
            {
              q: 'How does ApexBookings prevent double-booking conflicts?',
              a: 'Our platform uses PostgreSQL interval collision validation paired with unique client idempotency keys. When two clients attempt to book the exact same slot concurrently, the system accepts the first confirmed transaction and gracefully alerts the second client to choose an alternative open slot.',
            },
            {
              q: 'What are buffer zones and how do they prevent meeting fatigue?',
              a: 'Buffer zones allow you to define preparation time (before) and wrap-up time (after) for any service (e.g. 15 minutes). The slot generator automatically blocks out that extra time on your calendar, guaranteeing you never have back-to-back calls without a break.',
            },
            {
              q: 'Can staff members have different working shifts and break times?',
              a: 'Yes! Every staff member in your workspace can configure unique working days, shift hours (e.g. 09:00 - 17:00), daily lunch breaks, and specific holiday date overrides directly from the Availability tab.',
            },
            {
              q: 'Are video meeting links generated automatically?',
              a: 'Yes. For any service configured as an online meeting, ApexBookings automatically provisions a unique meeting link (e.g. Google Meet) and includes it in the confirmation screen and calendar record.',
            },
            {
              q: 'Can I manage appointments, reschedule, or mark them as completed?',
              a: 'Yes! The Bookings & Calendar page allows team members to filter appointments by status, mark sessions as Completed, reschedule to a new time slot with automatic collision checks, or cancel appointments.',
            },
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={item.q}
                className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-sm text-slate-900 flex items-center justify-between hover:text-indigo-600 transition-colors"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs leading-relaxed text-slate-600 border-t border-slate-100 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 11. BOTTOM CTA BANNER                                */}
      {/* ---------------------------------------------------- */}
      <section className="py-20 px-4 sm:px-8 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Ready to upgrade your appointment scheduling?
          </h2>
          <p className="text-sm sm:text-base text-indigo-200 max-w-xl mx-auto font-medium">
            Join modern consultancies, clinics, and professional firms scheduling client meetings on autopilot.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                variant="primary"
                className="bg-white hover:bg-slate-100 text-indigo-950 font-black text-sm px-8 py-4 shadow-xl rounded-xl transition-all"
              >
                START FREE TRIAL
              </Button>
            </Link>
            <Link href="/appointments">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm px-8 py-4 rounded-xl transition-all"
              >
                Open Appointments Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 12. ENTERPRISE SAAS FOOTER                           */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12 px-4 sm:px-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 text-left">
          {/* Col 1: Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span>ApexBookings</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Enterprise appointment scheduling platform with pure availability calculations, buffer management, and concurrency safety.
            </p>
            <div className="pt-2">
              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-semibold">
                SOC 2 • GDPR • HIPAA Ready
              </span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Architecture
            </span>
            <a href="#features" className="block hover:text-indigo-600 transition-colors">Availability Engine</a>
            <a href="#features" className="block hover:text-indigo-600 transition-colors">Concurrency Locks</a>
            <a href="#features" className="block hover:text-indigo-600 transition-colors">Buffer Protection</a>
            <a href="#features" className="block hover:text-indigo-600 transition-colors">Shift Management</a>
            <a href="#features" className="block hover:text-indigo-600 transition-colors">Google Meet Links</a>
          </div>

          {/* Col 3 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Solutions
            </span>
            <a href="#solutions" className="block hover:text-indigo-600 transition-colors">Consulting & Advisory</a>
            <a href="#solutions" className="block hover:text-indigo-600 transition-colors">Healthcare & Clinics</a>
            <a href="#solutions" className="block hover:text-indigo-600 transition-colors">Executive Coaching</a>
            <a href="#solutions" className="block hover:text-indigo-600 transition-colors">Financial Advisory</a>
            <a href="#solutions" className="block hover:text-indigo-600 transition-colors">Salons & Spas</a>
          </div>

          {/* Col 4 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Platform Links
            </span>
            <Link href="/appointments" className="block hover:text-indigo-600 transition-colors">
              Appointments Dashboard
            </Link>
            <Link href="/event-types" className="block hover:text-indigo-600 transition-colors">
              Event Types
            </Link>
            <Link href="/schedules" className="block hover:text-indigo-600 transition-colors">
              Schedules & Availability
            </Link>
            <Link href="/workflows" className="block hover:text-indigo-600 transition-colors">
              Automated Workflows
            </Link>
            <Link href="/signup" className="block hover:text-indigo-600 transition-colors">
              Sign Up Free
            </Link>
          </div>

          {/* Col 5 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Integrations
            </span>
            <span className="block text-slate-500">Google Calendar</span>
            <span className="block text-slate-500">Microsoft Outlook</span>
            <span className="block text-slate-500">Google Meet Video</span>
            <span className="block text-slate-500">Stripe & Deposits</span>
            <span className="block text-slate-500">PostgreSQL Audit Logs</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <span>
            © {new Date().getFullYear()} ApexBookings Enterprise Platform. Built with Clean Domain-Driven Architecture.
          </span>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-900 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-900 cursor-pointer">Security</span>
            <span className="hover:text-slate-900 cursor-pointer">Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
