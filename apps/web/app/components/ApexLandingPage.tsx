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
  Award,
  BookOpen,
  Sparkles,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import { Button, Badge } from '@bookings/ui';

export function ApexLandingPage() {
  // Tabs for "Here's How It Works"
  const [activeTab, setActiveTab] = React.useState<'STUDENTS' | 'ENTERPRISE'>('STUDENTS');

  // Pricing billing period: monthly or yearly (save 20%)
  const [annualBilling, setAnnualBilling] = React.useState(true);

  // Interactive scheduler preview state
  const [demoSelectedDay, setDemoSelectedDay] = React.useState('Mon, Sep 14');
  const [demoSelectedTime, setDemoSelectedTime] = React.useState('10:30 AM');
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
        <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 flex-wrap">
          <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse" />
          <span className="font-bold text-indigo-900">Rooman Technologies:</span>
          <span className="text-indigo-800/90 font-medium">
            25+ Years of IT Skilling Excellence • 1.5M+ Trained • Centers of Excellence across India.
          </span>
          <Link
            href="/book/rooman-technologies"
            className="text-indigo-600 hover:text-indigo-800 font-bold underline ml-1 inline-flex items-center gap-1"
          >
            <span>Book Free Career Guidance</span>
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
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-slate-900">
                    Rooman<span className="text-indigo-600">Bookings</span>
                  </span>
                  <Badge variant="info" className="text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider bg-indigo-50 text-indigo-700 border-indigo-200">
                    Official Portal
                  </Badge>
                </div>
                <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                  Rooman Technologies • Est. 1999
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
              <a href="#services" className="hover:text-slate-900 transition-colors">
                Skilling Programs
              </a>
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#solutions" className="hover:text-slate-900 transition-colors">
                Academic & CoE
              </a>
              <a href="#live-demo" className="hover:text-slate-900 transition-colors flex items-center gap-1.5">
                <span>Book Slot</span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              </a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">
                Pricing & Plans
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
                Faculty Dashboard
              </button>
            </Link>

            <Link href="/book/rooman-technologies">
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 px-4 py-2 rounded-xl transition-all"
              >
                BOOK CONSULTATION
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 3. HERO SECTION                                      */}
      {/* ---------------------------------------------------- */}
      <section className="relative pt-16 pb-20 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-white via-slate-50/60 to-[#fafbfc]">
        <div className="absolute top-10 left-1/4 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Hero Messaging */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold uppercase tracking-wider shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              <span>Upskilling India&apos;s Tech Workforce Since 1999</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
              Accelerate your tech career.{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-800 bg-clip-text text-transparent">
                Book expert Rooman mentoring.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed font-normal">
              Rooman Bookings connects students, job seekers, and university leaders directly with certified industry instructors. 
              Schedule 1-on-1 certification guidance, technical mock interviews, and university Center of Excellence (CoE) partnerships in seconds.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/book/rooman-technologies/career-guidance">
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm px-6 py-3.5 shadow-lg shadow-indigo-600/25 rounded-xl transition-all"
                >
                  BOOK 1-ON-1 GUIDANCE (FREE)
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>

              <Link
                href="/book/rooman-technologies"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 hover:text-slate-900 font-bold text-xs transition-all shadow-xs"
              >
                <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                <span>Browse All Rooman Services</span>
              </Link>

              <Link
                href="/appointments"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 px-3 py-2 transition-colors"
              >
                <span>Instructor Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>100% Placement Assistance</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Cisco, AWS & Microsoft Mentors</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Instant Google Meet video sessions</span>
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
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 flex items-center justify-center font-bold text-white text-base shadow-sm">
                      PS
                    </div>
                    <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Priya Sharma</h2>
                    <span className="text-xs text-slate-500 block">Principal AI & Cloud Architect • Rooman</span>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px] uppercase font-bold bg-emerald-50 text-emerald-700 border-emerald-200">
                  Slots Open
                </Badge>
              </div>

              {/* Service Details */}
              <div className="py-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900 text-sm">1-on-1 IT Career & Certification Guidance</span>
                  <span className="font-extrabold text-emerald-600 text-sm">FREE (₹0)</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-600" />
                    <span>30 mins</span>
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
                  Select Date (Indian Standard Time - IST)
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
                  Available Slots (IST)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['10:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((time) => {
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
                    Selected {demoSelectedDay} at {demoSelectedTime}! Confirming with Rooman mentor...
                  </span>
                </div>
              )}

              {/* Buffer & Real Booking Link */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                  <Shield className="h-3.5 w-3.5" />
                  <span>Zero-Collision Real Time Scheduling</span>
                </div>
                <Link
                  href="/book/rooman-technologies"
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
            Rooman Technologies • Over Two Decades of Impact in Tech Education & Placements
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 block">1.5M+</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Students & Professionals Trained
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 block">1,000+</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Hiring & Academic Partners
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 block">98.4%</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Placement Assistance Success
              </span>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 block">25+ Yrs</span>
              <span className="text-xs text-slate-600 font-semibold mt-1 block">
                Pioneering IT Training Since 1999
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. "HERE'S HOW ROOMAN BOOKINGS WORKS"                */}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto text-center space-y-12">
        <div>
          <Badge variant="info" className="text-xs px-3 py-1 font-bold uppercase tracking-wider mb-3 bg-indigo-50 text-indigo-700 border-indigo-200">
            Frictionless Consultation
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Here&apos;s how <span className="text-indigo-600">Rooman Bookings</span> works
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto mt-3">
            Whether you are a student exploring AI/Cloud careers or a university director setting up a CoE, scheduling takes seconds.
          </p>

          {/* Perspective Tab Buttons */}
          <div className="inline-flex items-center p-1.5 rounded-2xl bg-slate-100 border border-slate-200 mt-8">
            <button
              type="button"
              onClick={() => setActiveTab('STUDENTS')}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'STUDENTS'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              For Students & Job Seekers
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ENTERPRISE')}
              className={`px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all ${
                activeTab === 'ENTERPRISE'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              For Universities & Corporates
            </button>
          </div>
        </div>

        {/* Tab 1: For Students */}
        {activeTab === 'STUDENTS' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 01
              </span>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Select Specialization & Slot</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Choose between AI/ML, Cloud DevOps, Cybersecurity, Cisco Networking, or Full-Stack. Pick a convenient time slot in Indian Standard Time (IST).
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 02
              </span>
              <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Share Goals & Resume</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Tell us your academic background, target certifications, and dream companies so our instructors can prepare tailored advice for your session.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 03
              </span>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <CalendarCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Live Video Mentoring</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Receive an instant Google Meet calendar invite with meeting notes. Meet your Rooman mentor and build your career roadmap.
              </p>
            </div>
          </div>
        )}

        {/* Tab 2: For Enterprise & Universities */}
        {activeTab === 'ENTERPRISE' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 01
              </span>
              <div className="h-12 w-12 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600 group-hover:scale-110 transition-transform">
                <GraduationCap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Select Partnership Scope</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Choose between On-Campus Center of Excellence (CoE) setup, Faculty Development Programs (FDP), or Corporate Engineering Team Reskilling.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-amber-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 02
              </span>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Direct Director Meeting</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Connect directly with Rooman Academic Directors and Enterprise Leads. Review curriculum alignment, lab hardware, and placement MOUs.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-cyan-200 transition-all group space-y-4">
              <span className="text-xs font-black text-indigo-600 tracking-widest uppercase block">
                STEP 03
              </span>
              <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center text-cyan-600 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">MOU & Lab Rollout</h3>
              <p className="text-xs leading-relaxed text-slate-600">
                Finalize timelines, lab installations, and student cohort schedules with full institutional backing from Rooman Technologies.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. SIX CORE ROBUST ENGINE PILLARS                    */}
      {/* ---------------------------------------------------- */}
      <section id="features" className="py-20 px-4 sm:px-8 bg-slate-50/80 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-3">
            <Badge variant="default" className="text-xs px-3 py-1 font-bold uppercase tracking-wider bg-slate-200/80 text-slate-700 border-slate-300">
              Enterprise Grade Platform
            </Badge>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              Enterprise scheduling precision
            </h2>
            <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
              Engineered with transactional integrity to handle thousands of concurrent counseling sessions across India.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="h-11 w-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Zero Double-Bookings</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PostgreSQL transactional locks guarantee that two students cannot book the same mentor slot simultaneously, even under heavy admission traffic.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Timezone Intelligence</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Built with date-fns-tz and stored in UTC. Automatically converts meeting times seamlessly for international students and overseas enterprise clients.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="h-11 w-11 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Shield className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Prep & Review Buffers</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automatic 10-15 minute buffer protection before and after mock interviews, allowing mentors to review resumes and finalize scorecards.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="h-11 w-11 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Faculty Shift Management</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Configure unique working shifts, lunch breaks, and holiday schedules for senior trainers across Cisco, AWS, Red Hat, and AI disciplines.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="h-11 w-11 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
                <Video className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated Google Meet Video</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Instant video meeting links provisioned for every booking, embedded in calendar invitations and guest confirmation pages.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all space-y-4">
              <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                <Bell className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Tenant Routing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dedicated booking catalogs for each regional Rooman center, university partner campus, and corporate client portal.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 7. ROOOMAN ACADEMIC & CORPORATE SOLUTIONS            */}
      {/* ---------------------------------------------------- */}
      <section id="solutions" className="py-24 px-4 sm:px-8 max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-3">
          <Badge variant="purple" className="text-xs px-3 py-1 font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border-purple-200">
            Specialized Tracks
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Consultation tracks for every stage
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            From fresh engineering graduates to university deans and enterprise CTOs, Rooman Technologies provides specialized advisory.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
            <h4 className="text-base font-bold text-slate-900">Career & Certification</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              1-on-1 counseling for fresh graduates and IT aspirants. Discover high-growth career roadmaps in AI, Cloud, and Cybersecurity.
            </p>
            <Link href="/book/rooman-technologies/career-guidance" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 inline-block pt-1">
              Book Free Session →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <Award className="h-7 w-7 text-rose-600" />
            <h4 className="text-base font-bold text-slate-900">Technical Mock Interviews</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              45-minute rigorous technical interview practice with senior industry architects. Includes coding, system design, and scorecards.
            </p>
            <Link href="/book/rooman-technologies/mock-interview-assessment" className="text-xs font-bold text-rose-600 hover:text-rose-800 inline-block pt-1">
              Book Mock Interview →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <Building2 className="h-7 w-7 text-amber-600" />
            <h4 className="text-base font-bold text-slate-900">University CoE Labs</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Consultation for college deans, trustees, and principals to set up on-campus Centers of Excellence with Cisco, Red Hat & AWS equipment.
            </p>
            <Link href="/book/rooman-technologies/university-coe-consultation" className="text-xs font-bold text-amber-600 hover:text-amber-800 inline-block pt-1">
              Schedule CoE Meeting →
            </Link>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
            <Briefcase className="h-7 w-7 text-purple-600" />
            <h4 className="text-base font-bold text-slate-900">Corporate Upskilling</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Customized training programs for corporate engineering teams. Upskill in Generative AI, Cloud Infrastructure, and Cyber Defense.
            </p>
            <Link href="/book/rooman-technologies/corporate-upskilling-discovery" className="text-xs font-bold text-purple-600 hover:text-purple-800 inline-block pt-1">
              Explore Enterprise →
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
            Live Booking Portal
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Ready to schedule with Rooman Technologies?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Experience our instant appointment booking flow. Choose your program, select an expert instructor, and reserve your video meeting slot.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <Link href="/book/rooman-technologies">
              <Button
                size="lg"
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm px-8 py-4 shadow-lg shadow-indigo-600/25 rounded-xl transition-all"
              >
                Launch Rooman Booking Catalog
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>

            <Link href="/calendar">
              <Button
                size="lg"
                variant="outline"
                className="bg-white border-slate-200 hover:border-slate-300 text-slate-800 hover:text-slate-900 font-bold text-sm px-8 py-4 rounded-xl shadow-xs"
              >
                View Instructor Calendar
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
            Consultation Tiers
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Accessible counseling and advanced assessments
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto">
            100% free career roadmapping for students, accessible mock interviews, and tailored enterprise partnership packages.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
          {/* Plan 1: Student Free */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Student Career Guidance</h3>
                <p className="text-xs text-slate-500 mt-1">1-on-1 counseling for fresh graduates & job seekers</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">₹0</span>
                <span className="text-xs font-bold text-emerald-600 ml-1">FREE</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>30-minute 1-on-1 session</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>AI, Cloud & Cybersecurity roadmap</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Google Meet video call</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Course syllabus & certification guidance</span>
                </li>
              </ul>
            </div>
            <Link href="/book/rooman-technologies/career-guidance" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
              >
                Book Free Counseling
              </button>
            </Link>
          </div>

          {/* Plan 2: Pro Mock Interview (Featured) */}
          <div className="p-8 rounded-3xl bg-white border-2 border-indigo-600 shadow-xl shadow-indigo-600/10 space-y-6 flex flex-col justify-between relative">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
              <span className="bg-indigo-600 text-white font-bold text-[10px] tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">
                Most Popular
              </span>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Technical Mock Interview</h3>
                <p className="text-xs text-slate-500 mt-1">Rigorous placement readiness evaluation</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">₹499</span>
                <span className="text-xs text-slate-500">/ session</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>45-minute live technical interview</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Coding / System design / Networking evaluation</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Detailed written scorecard & feedback</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Resume & LinkedIn profile critique</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>Priority placement drive referral</span>
                </li>
              </ul>
            </div>
            <Link href="/book/rooman-technologies/mock-interview-assessment" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-600/25"
              >
                Schedule Mock Interview
              </button>
            </Link>
          </div>

          {/* Plan 3: University CoE & Corporate */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">University CoE & Enterprise</h3>
                <p className="text-xs text-slate-500 mt-1">Institutional partnerships & workforce training</p>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900">Custom</span>
                <span className="text-xs text-slate-500">MOU Based</span>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-600 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>60-minute executive briefing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>On-campus Center of Excellence lab setup</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Faculty Development Programs (FDP)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Dedicated corporate training cohorts</span>
                </li>
              </ul>
            </div>
            <Link href="/book/rooman-technologies/university-coe-consultation" className="w-full">
              <button
                type="button"
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors shadow-xs"
              >
                Schedule Partnership Call
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
            Learn more about Rooman Technologies courses, booking procedures, and CoE partnerships.
          </p>
        </div>

        <div className="space-y-4 text-left">
          {[
            {
              q: 'Who will I meet during the 1-on-1 Career Guidance session?',
              a: 'You will meet directly with certified Rooman senior technical advisors and industry mentors specializing in AI/ML, Cloud Computing (AWS/Azure), Cybersecurity, or Cisco Networking. They will review your goals and explain industry-demanded skill paths.',
            },
            {
              q: 'Is the 1-on-1 career consultation really 100% free?',
              a: 'Yes! As part of Rooman Technologies mission to upskill Indias tech workforce, initial 30-minute career counseling and course roadmapping sessions are completely free of cost with zero obligations.',
            },
            {
              q: 'How does the Technical Mock Interview work?',
              a: 'The mock interview is a 45-minute live 1-on-1 technical session conducted over Google Meet. You will be evaluated on practical problem-solving, theoretical concepts, and communication. Afterwards, you receive a detailed written scorecard highlighting your strengths and areas for improvement.',
            },
            {
              q: 'How can our university or engineering college partner with Rooman for a Center of Excellence (CoE)?',
              a: 'College trustees, deans, and department heads can schedule an Executive CoE Discovery Session through this portal. Our Academic Director will present the CoE framework, hardware and software lab requirements, curriculum integration, and joint placement support.',
            },
            {
              q: 'What certifications does Rooman Technologies prepare students for?',
              a: 'Rooman prepares students for globally recognized credentials including Cisco (CCNA, CCNP), Microsoft Azure, AWS Cloud Architect, Red Hat (RHCSA/RHCE), CompTIA Security+, CEH (Certified Ethical Hacker), and specialized Full-Stack AI certifications.',
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
      <section className="py-20 px-4 sm:px-8 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-950 text-white text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            Take the next leap in your tech career today
          </h2>
          <p className="text-sm sm:text-base text-indigo-200 max-w-xl mx-auto font-medium">
            Join over 1.5 million professionals trained by Rooman Technologies across India. Reserve your slot in under 60 seconds.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link href="/book/rooman-technologies/career-guidance">
              <Button
                size="lg"
                variant="primary"
                className="bg-white hover:bg-slate-100 text-indigo-950 font-black text-sm px-8 py-4 shadow-xl rounded-xl transition-all"
              >
                BOOK FREE CAREER GUIDANCE
              </Button>
            </Link>
            <Link href="/book/rooman-technologies">
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-sm px-8 py-4 rounded-xl transition-all"
              >
                Browse All Rooman Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 12. ROOOMAN ENTERPRISE FOOTER                        */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-200 pt-16 pb-12 px-4 sm:px-8 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8 mb-12 text-left">
          {/* Col 1: Brand */}
          <div className="col-span-2 md:col-span-1 space-y-3">
            <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
              <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                <Calendar className="h-3.5 w-3.5" />
              </div>
              <span>Rooman Bookings</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Official consultation & appointment scheduling platform for Rooman Technologies. Pioneering IT vocational training and certification in India since 1999.
            </p>
            <div className="pt-2">
              <span className="inline-block px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[10px] text-slate-600 font-semibold">
                Bangalore • Nationwide Centers
              </span>
            </div>
          </div>

          {/* Col 2 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              IT Certification
            </span>
            <span className="block text-slate-600">Artificial Intelligence & ML</span>
            <span className="block text-slate-600">Cloud Computing (AWS / Azure)</span>
            <span className="block text-slate-600">Cybersecurity & Ethical Hacking</span>
            <span className="block text-slate-600">Cisco CCNA / CCNP Routing</span>
            <span className="block text-slate-600">Red Hat Enterprise Linux</span>
          </div>

          {/* Col 3 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Institutional
            </span>
            <span className="block text-slate-600">Center of Excellence (CoE)</span>
            <span className="block text-slate-600">College Faculty Development</span>
            <span className="block text-slate-600">Corporate Team Reskilling</span>
            <span className="block text-slate-600">PMKVY & NSDC Initiatives</span>
            <span className="block text-slate-600">Campus Placement Drives</span>
          </div>

          {/* Col 4 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Quick Portals
            </span>
            <Link href="/book/rooman-technologies" className="block hover:text-indigo-600 transition-colors">
              Rooman Booking Catalog
            </Link>
            <Link href="/appointments" className="block hover:text-indigo-600 transition-colors">
              Faculty Dashboard
            </Link>
            <Link href="/calendar" className="block hover:text-indigo-600 transition-colors">
              Schedule Calendar
            </Link>
            <Link href="/login" className="block hover:text-indigo-600 transition-colors">
              Staff Sign In
            </Link>
          </div>

          {/* Col 5 */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-slate-900 uppercase tracking-wider block mb-1">
              Headquarters
            </span>
            <span className="block text-slate-500">Rooman Technologies Pvt. Ltd.</span>
            <span className="block text-slate-500">Bengaluru, Karnataka, India</span>
            <span className="block text-slate-500">info@rooman.net</span>
            <a href="https://www.rooman.com" target="_blank" rel="noreferrer" className="block text-indigo-600 hover:underline">
              www.rooman.com ↗
            </a>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
          <span>
            © {new Date().getFullYear()} Rooman Technologies Pvt. Ltd. All Rights Reserved. Rooman Bookings Platform.
          </span>
          <div className="flex items-center gap-6">
            <span className="hover:text-slate-900 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-slate-900 cursor-pointer">Terms of Service</span>
            <span className="hover:text-slate-900 cursor-pointer">Centers across India</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
