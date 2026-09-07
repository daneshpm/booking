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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* ---------------------------------------------------- */}
      {/* 1. ANNOUNCEMENT TOP BANNER                           */}
      {/* ---------------------------------------------------- */}
      <div className="bg-gradient-to-r from-blue-900/60 via-indigo-900/60 to-purple-900/60 border-b border-slate-800 text-[11px] text-slate-300 py-2 px-4 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
          <span className="font-semibold text-white">ApexBookings 2.0 Live:</span>
          <span>Intelligent buffer protection, live Postgres slot calculations & concurrency safety.</span>
          <Link
            href="/book/acme-consulting"
            className="text-blue-400 hover:text-blue-300 font-bold underline ml-1 inline-flex items-center gap-1"
          >
            <span>Explore Live Demo</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. STICKY PRODUCT HEADER                            */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-white">
                    Apex<span className="text-blue-500">Bookings</span>
                  </span>
                  <Badge variant="info" className="text-[9px] px-1.5 py-0 uppercase font-black tracking-wider">
                    Enterprise
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide">
                  Appointment Scheduling Platform
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-300">
              <a href="#features" className="hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="hover:text-white transition-colors">
                How It Works
              </a>
              <a href="#solutions" className="hover:text-white transition-colors">
                Solutions
              </a>
              <a href="#live-demo" className="hover:text-white transition-colors flex items-center gap-1">
                <span>Live Sandbox</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              </a>
              <a href="#pricing" className="hover:text-white transition-colors">
                Pricing
              </a>
              <a href="#faq" className="hover:text-white transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <button
                type="button"
                className="px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white rounded-xl hover:bg-slate-900 transition-all"
              >
                Sign In
              </button>
            </Link>

            <Link href="/appointments">
              <button
                type="button"
                className="px-3.5 py-2 text-xs font-bold text-purple-300 hover:text-purple-100 rounded-xl hover:bg-purple-950/40 transition-all"
              >
                Appointments
              </button>
            </Link>

            <Link href="/signup">
              <Button
                variant="primary"
                size="sm"
                className="bg-[#5c34ad] hover:bg-[#4d2994] text-white font-bold text-xs shadow-lg shadow-purple-600/25 border border-purple-500 px-4 py-2 rounded-xl"
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
      <section className="relative pt-12 pb-20 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900/90 to-slate-950">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Messaging */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/70 border border-blue-800 text-blue-300 text-xs font-bold uppercase tracking-wider shadow-sm">
              <Layers className="h-3.5 w-3.5 text-blue-400" />
              <span>Multi-Tenant Scheduling Platform</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1]">
              Automate appointments.{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-violet-300 bg-clip-text text-transparent">
                Protect your team&apos;s focus.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-xl leading-relaxed font-normal">
              ApexBookings replaces messy email chains with frictionless client booking portals.
              Powered by pure timezone-aware availability, automatic buffer protection, staff shifts,
              and concurrency locks to guarantee zero double-bookings.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/signup">
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-[#5c34ad] hover:bg-[#4d2994] text-white font-extrabold text-sm px-6 py-3.5 shadow-xl shadow-purple-600/30 border border-purple-500 rounded-xl"
                >
                  START FREE TRIAL
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>

              <Link
                href="/appointments"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 hover:text-white font-bold text-xs transition-all shadow-md"
              >
                <Sliders className="h-3.5 w-3.5 text-purple-400" />
                <span>Open Appointments Dashboard</span>
              </Link>

              <Link
                href="/book/acme-consulting"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white px-3 py-2 transition-colors"
              >
                <span>Preview Client Booker</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Zero double-booking guarantee</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Auto Google Meet & Zoom links</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Intelligent prep & wrap buffers</span>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Scheduler Preview Widget */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl shadow-blue-950/40 p-6 backdrop-blur-xl">
              {/* Host Profile */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-white text-base shadow-md">
                      SJ
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Sarah Jenkins</h2>
                    <span className="text-xs text-slate-400 block">Principal Advisory Consultant</span>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] uppercase font-bold">
                  Accepting Clients
                </Badge>
              </div>

              {/* Service Details */}
              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white text-sm">Initial Strategy Consultation</span>
                  <span className="font-extrabold text-emerald-400 text-sm">$85.00</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-blue-400" />
                    <span>45 mins</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-purple-400" />
                    <span>Google Meet Video</span>
                  </div>
                </div>
              </div>

              {/* Interactive Day Selector */}
              <div className="pt-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
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
                          ? 'bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-600/30 scale-[1.02]'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clickable Open Time Slots */}
              <div className="pt-4">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
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
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/25'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
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
                <div className="mt-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs flex items-center gap-2 animate-pulse">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Selected {demoSelectedDay} at {demoSelectedTime}!
                  </span>
                </div>
              )}

              {/* Buffer & Real Booking Link */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                  <Shield className="h-3.5 w-3.5" />
                  <span>15m Prep/Wrap Buffer Auto-Protected</span>
                </div>
                <Link
                  href="/book/acme-consulting"
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
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
      <section className="py-12 border-y border-slate-800/80 bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <p className="text-center text-xs font-bold tracking-wider text-slate-400 uppercase mb-8">
            Engineered for high-performing advisory practices, clinics, and professional firms
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <span className="text-3xl sm:text-4xl font-black text-white block">100%</span>
              <span className="text-xs text-slate-400 font-semibold mt-1 block">
                Pure Concurrency Protection
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <span className="text-3xl sm:text-4xl font-black text-emerald-400 block">85%</span>
              <span className="text-xs text-slate-400 font-semibold mt-1 block">
                Reduction in No-Shows
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <span className="text-3xl sm:text-4xl font-black text-blue-400 block">99.99%</span>
              <span className="text-xs text-slate-400 font-semibold mt-1 block">
                Availability Engine SLA
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/60">
              <span className="text-3xl sm:text-4xl font-black text-purple-400 block">0ms</span>
              <span className="text-xs text-slate-400 font-semibold mt-1 block">
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
          <Badge variant="info" className="text-xs px-3 py-1 font-bold uppercase tracking-wider mb-3">
            Streamlined 3-Step Flow
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Here&apos;s how <span className="text-blue-500">ApexBookings</span> works
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto mt-3">
            Designed for an effortless client booking experience and airtight calendar control for your team.
          </p>

          {/* Perspective Tab Buttons */}
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-900 border border-slate-800 mt-8">
            <button
              type="button"
              onClick={() => setActiveTab('CLIENTS')}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'CLIENTS'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              For your clients
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TEAM')}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'TEAM'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              For you & your team
            </button>
          </div>
        </div>

        {/* Tab 1: For Clients */}
        {activeTab === 'CLIENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-blue-500/50 transition-all group">
              <span className="text-xs font-black text-blue-400 tracking-widest uppercase block">
                STEP 01
              </span>
              <div className="h-12 w-12 rounded-2xl bg-blue-950/70 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Pick a convenient time slot</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Clients pick their preferred meeting time in seconds. Available slots automatically adapt
                to their local timezone with zero confusion.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-blue-500/50 transition-all group">
              <span className="text-xs font-black text-blue-400 tracking-widest uppercase block">
                STEP 02
              </span>
              <div className="h-12 w-12 rounded-2xl bg-indigo-950/70 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Fill in booking details</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Clients share intake details, contact information, and meeting goals to help your team prepare
                before the conversation begins.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-blue-500/50 transition-all group">
              <span className="text-xs font-black text-blue-400 tracking-widest uppercase block">
                STEP 03
              </span>
              <div className="h-12 w-12 rounded-2xl bg-emerald-950/70 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Instant confirmation & meeting link</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Both parties receive instant confirmations, auto-generated Google Meet video links, and automated
                reminders so no one forgets.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: For Team */}
        {activeTab === 'TEAM' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-blue-500/50 transition-all group">
              <span className="text-xs font-black text-blue-400 tracking-widest uppercase block">
                STEP 01
              </span>
              <div className="h-12 w-12 rounded-2xl bg-purple-950/70 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Configure services & pricing</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Set up consultations, discovery calls, reviews, and team sessions with custom durations, locations,
                and pricing tiers.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-blue-500/50 transition-all group">
              <span className="text-xs font-black text-blue-400 tracking-widest uppercase block">
                STEP 02
              </span>
              <div className="h-12 w-12 rounded-2xl bg-amber-950/70 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Define shifts & buffers</h3>
              <p className="text-xs leading-relaxed text-slate-400">
                Set weekly staff hours, lunch breaks, holiday leaves, and prep/wrap-up buffers to protect your team
                from meeting exhaustion.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4 hover:border-blue-500/50 transition-all group">
              <span className="text-xs font-black text-blue-400 tracking-widest uppercase block">
                STEP 03
              </span>
              <div className="h-12 w-12 rounded-2xl bg-cyan-950/70 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Appointments on autopilot</h3>
              <p className="text-xs leading-relaxed text-slate-400">
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
      <section id="features" className="py-24 px-4 sm:px-8 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <Badge variant="warning" className="text-xs px-3 py-1 font-bold uppercase tracking-wider">
              Core Architecture
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Built for speed, accuracy, and operational scale
            </h2>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
              Engineered with clean domain-driven architecture, PostgreSQL concurrency checks, and responsive design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {/* 1. Concurrency Protection */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-blue-950 flex items-center justify-center text-blue-400">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Concurrency Race-Condition Locks</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unique idempotency keys and pre-commit interval collision validation guarantee zero double-bookings,
                even when multiple clients book simultaneously.
              </p>
            </div>

            {/* 2. Buffer Times & Shift Management */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-purple-950 flex items-center justify-center text-purple-400">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Buffer Zones & Break Protection</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically pad meetings with prep and wrap-up buffers (e.g. 15 mins). Enforce staff lunch breaks
                and custom holiday leave overrides.
              </p>
            </div>

            {/* 3. Real-Time Slot Engine */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-950 flex items-center justify-center text-indigo-400">
                <RefreshCw className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Dynamic Slot Generation</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Our mathematical availability engine computes open slots on the fly from staff schedules,
                filtering out past times and existing bookings in real time.
              </p>
            </div>

            {/* 4. Automated Video Conferencing */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-950 flex items-center justify-center text-cyan-400">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Automated Video Meetings</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatically generates unique Google Meet or video conferencing links for every online consultation,
                displayed right on the calendar.
              </p>
            </div>

            {/* 5. Multi-Staff & Round Robin */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-400">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Multi-Staff Team Management</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Assign specific services to individual specialists or pool team availability. Clients can select
                their preferred advisor with ease.
              </p>
            </div>

            {/* 6. Admin Control & Audit Logs */}
            <div className="p-8 rounded-3xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3">
              <div className="h-10 w-10 rounded-xl bg-rose-950 flex items-center justify-center text-rose-400">
                <CalendarCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Admin Calendar & Full Audit Logs</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
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
          <Badge variant="purple" className="text-xs px-3 py-1 font-bold uppercase tracking-wider">
            Tailored Solutions
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Built for service professionals and teams
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Whether you&apos;re a boutique consultancy, medical clinic, or advisory practice, ApexBookings fits your flow.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-600 transition-all">
            <Briefcase className="h-7 w-7 text-blue-400" />
            <h4 className="text-base font-bold text-white">Consulting & Advisory</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paid client advisory sessions, discovery interviews, and contract strategy meetings with Google Meet.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-blue-400 hover:underline inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-600 transition-all">
            <HeartHandshake className="h-7 w-7 text-rose-400" />
            <h4 className="text-base font-bold text-white">Healthcare & Therapy</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Patient telehealth appointments, multi-specialist shift coverage, and buffer-protected clinical sessions.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-rose-400 hover:underline inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-600 transition-all">
            <GraduationCap className="h-7 w-7 text-amber-400" />
            <h4 className="text-base font-bold text-white">Coaching & Education</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Executive coaching sprints, student office hours, recurring curriculum reviews, and intake questionnaires.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-amber-400 hover:underline inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 hover:border-slate-600 transition-all">
            <Building2 className="h-7 w-7 text-purple-400" />
            <h4 className="text-base font-bold text-white">Financial & Corporate</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quarterly tax reviews, investment consultations, and high-security client scheduling with full audit trails.
            </p>
            <Link href="/book/acme-consulting" className="text-xs font-bold text-purple-400 hover:underline inline-block pt-1">
              View Demo Portal →
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 8. INTERACTIVE LIVE BOOKING SANDBOX                  */}
      {/* ---------------------------------------------------- */}
      <section id="live-demo" className="py-20 px-4 sm:px-8 bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/30 border-y border-slate-800">
        <div className="max-w-5xl mx-auto rounded-3xl bg-slate-900/90 border border-slate-800 p-8 md:p-12 shadow-2xl text-center space-y-8">
          <Badge variant="info" className="text-xs px-3 py-1 font-bold uppercase tracking-wider">
            Experience It Live
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Try the real booking engine in your browser right now
          </h2>
          <p className="text-sm text-slate-300 max-w-xl mx-auto">
            Book an appointment slot on our demo workspace. Watch how staff shifts, lunch breaks, and buffer times
            are calculated live from PostgreSQL with zero mock delays.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link href="/book/acme-consulting">
              <Button
                size="lg"
                variant="primary"
                className="bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm px-8 py-4 shadow-xl shadow-blue-600/30 rounded-xl"
              >
                Launch Client Booking Portal
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <Link href="/calendar">
              <Button
                size="lg"
                variant="outline"
                className="bg-slate-950 border-slate-700 hover:border-slate-500 text-white font-bold text-sm px-8 py-4 rounded-xl"
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
          <Badge variant="success" className="text-xs px-3 py-1 font-bold uppercase tracking-wider">
            Simple Pricing
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Transparent plans for solo advisors and growing teams
          </h2>
          <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto">
            Everything you need with zero hidden charges. Upgrade as your team and client volume expands.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-3 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold mt-4">
            <button
              type="button"
              onClick={() => setAnnualBilling(false)}
              className={`px-4 py-2 rounded-xl transition-all ${
                !annualBilling ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              onClick={() => setAnnualBilling(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl transition-all ${
                annualBilling ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left items-stretch">
          {/* Plan 1: Free Forever */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Starter</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-xs text-slate-400 font-semibold">/ forever</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Great for solo practitioners and independent specialists starting out.
              </p>

              <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>1 Staff Member profile</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited client appointments</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Google Meet video generation</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Admin calendar & customers list</span>
                </div>
              </div>
            </div>

            <Link href="/book/acme-consulting" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
              >
                Start Free
              </button>
            </Link>
          </div>

          {/* Plan 2: Professional (Most Popular) */}
          <div className="p-8 rounded-3xl bg-slate-900 border-2 border-blue-500 flex flex-col justify-between space-y-6 relative shadow-2xl shadow-blue-950/40">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider shadow-md">
              MOST POPULAR
            </span>

            <div className="space-y-4 pt-2">
              <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Professional</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{annualBilling ? '$12' : '$15'}</span>
                <span className="text-xs text-slate-400 font-semibold">/ staff / mo</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                For growing practices that need buffer protection, multi-staff scheduling, and payments.
              </p>

              <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-200">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Up to 10 Staff Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Intelligent Prep & Wrap Buffers</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Custom Staff Shifts & Holiday Overrides</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Online Payments & Deposits</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Full Audit Logs & Concurrency Safety</span>
                </div>
              </div>
            </div>

            <Link href="/book/acme-consulting" className="w-full">
              <button
                type="button"
                className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-lg shadow-blue-600/30 transition-all"
              >
                GET STARTED TODAY
              </button>
            </Link>
          </div>

          {/* Plan 3: Enterprise */}
          <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Enterprise</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">{annualBilling ? '$24' : '$29'}</span>
                <span className="text-xs text-slate-400 font-semibold">/ staff / mo</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                For organizations requiring unlimited multi-tenant workspaces, SLA, and custom domain white-labeling.
              </p>

              <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Unlimited Staff & Workspaces</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Custom Domain & Brand White-Label</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Round-Robin Team Distribution</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Priority 24/7 Dedicated Support & SLA</span>
                </div>
              </div>
            </div>

            <Link href="/book/acme-consulting" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all"
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
          <Badge variant="default" className="text-xs px-3 py-1 font-bold uppercase tracking-wider">
            Got Questions?
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
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
                className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left font-bold text-sm text-white flex items-center justify-between hover:text-blue-400 transition-colors"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-blue-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs leading-relaxed text-slate-400 border-t border-slate-800/60 pt-3">
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
      <section className="py-20 px-4 sm:px-8 bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 text-white text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Ready to upgrade your appointment scheduling?
          </h2>
          <p className="text-sm sm:text-base text-blue-100 max-w-xl mx-auto font-medium">
            Join modern consultancies, clinics, and professional firms scheduling client meetings on autopilot.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button
                size="lg"
                variant="primary"
                className="bg-white hover:bg-slate-100 text-[#5c34ad] font-black text-sm px-8 py-4 shadow-2xl rounded-xl"
              >
                START FREE TRIAL
              </Button>
            </Link>
            <Link href="/appointments">
              <Button
                size="lg"
                variant="outline"
                className="bg-purple-900/60 border-white/40 text-white hover:bg-purple-900 font-bold text-sm px-8 py-4 rounded-xl"
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
      <footer className="bg-slate-950 border-t border-slate-900 pt-16 pb-12 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 text-left">
          {/* Col 1: Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2 font-black text-white text-sm">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span>ApexBookings</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Enterprise appointment scheduling platform with pure availability calculations, buffer management, and concurrency safety.
            </p>
            <div className="pt-2">
              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-semibold">
                SOC 2 • GDPR • HIPAA Ready
              </span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-1">
              Architecture
            </span>
            <a href="#features" className="block hover:text-white transition-colors">Availability Engine</a>
            <a href="#features" className="block hover:text-white transition-colors">Concurrency Locks</a>
            <a href="#features" className="block hover:text-white transition-colors">Buffer Protection</a>
            <a href="#features" className="block hover:text-white transition-colors">Shift Management</a>
            <a href="#features" className="block hover:text-white transition-colors">Google Meet Links</a>
          </div>

          {/* Col 3 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-1">
              Solutions
            </span>
            <a href="#solutions" className="block hover:text-white transition-colors">Consulting & Advisory</a>
            <a href="#solutions" className="block hover:text-white transition-colors">Healthcare & Clinics</a>
            <a href="#solutions" className="block hover:text-white transition-colors">Executive Coaching</a>
            <a href="#solutions" className="block hover:text-white transition-colors">Financial Advisory</a>
            <a href="#solutions" className="block hover:text-white transition-colors">Salons & Spas</a>
          </div>

          {/* Col 4 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-1">
              Platform Links
            </span>
            <Link href="/appointments" className="block hover:text-white transition-colors">
              Appointments Dashboard
            </Link>
            <Link href="/event-types" className="block hover:text-white transition-colors">
              Event Types
            </Link>
            <Link href="/schedules" className="block hover:text-white transition-colors">
              Schedules & Availability
            </Link>
            <Link href="/workflows" className="block hover:text-white transition-colors">
              Automated Workflows
            </Link>
            <Link href="/signup" className="block hover:text-white transition-colors">
              Sign Up Free
            </Link>
          </div>

          {/* Col 5 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-white uppercase tracking-wider block mb-1">
              Integrations
            </span>
            <span className="block text-slate-400">Google Calendar</span>
            <span className="block text-slate-400">Microsoft Outlook</span>
            <span className="block text-slate-400">Google Meet Video</span>
            <span className="block text-slate-400">Stripe & Deposits</span>
            <span className="block text-slate-400">PostgreSQL Audit Logs</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
          <span>
            © {new Date().getFullYear()} ApexBookings Enterprise Platform. Built with Clean Domain-Driven Architecture.
          </span>
          <div className="flex items-center gap-6">
            <span className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span className="hover:text-white cursor-pointer">Terms of Service</span>
            <span className="hover:text-white cursor-pointer">Security</span>
            <span className="hover:text-white cursor-pointer">Compliance</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
