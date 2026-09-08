'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Shield,
  CheckCircle2,
  Video,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Check,
  ExternalLink,
  Zap,
  Lock,
  Bell,
  Layers,
  GraduationCap,
  Building2,
  Award,
  Sparkles,
  ArrowUpRight,
  CheckCircle,
} from 'lucide-react';
import { Button } from '@bookings/ui';

export function ApexLandingPage() {
  // Tabs for "Here's How It Works"
  const [activeTab, setActiveTab] = React.useState<'STUDENTS' | 'INSTITUTIONAL'>('STUDENTS');

  // Interactive scheduler preview state
  const [demoSelectedDay, setDemoSelectedDay] = React.useState('Tomorrow');
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
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-indigo-600 selection:text-white">
      {/* ---------------------------------------------------- */}
      {/* 1. AIRY, CLEAN, PREMIUM HEADER (NO CONGESTION)       */}
      {/* ---------------------------------------------------- */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 sm:px-12 py-4 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Mark with Official Rooman Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/rooman-logo.png"
                alt="Rooman Technologies"
                className="h-7 w-auto object-contain transition-transform group-hover:opacity-90"
              />
              <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-widest text-slate-400 pl-3 border-l border-slate-200">
                Bookings
              </span>
            </Link>

            {/* Clean, spacious primary nav */}
            <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#tracks" className="hover:text-slate-900 transition-colors">
                Programs
              </a>
              <a href="#how-it-works" className="hover:text-slate-900 transition-colors">
                How It Works
              </a>
              <a href="#coe" className="hover:text-slate-900 transition-colors">
                Centers of Excellence
              </a>
              <a href="#pricing" className="hover:text-slate-900 transition-colors">
                Pricing
              </a>
              <a href="#faq" className="hover:text-slate-900 transition-colors">
                FAQ
              </a>
            </nav>
          </div>

          {/* Right Action Area - Clean & Uncluttered */}
          <div className="flex items-center gap-5">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Sign In
            </Link>

            <Link href="/book/rooman-technologies">
              <Button
                variant="primary"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm hover:shadow transition-all"
              >
                Book a Session
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------- */}
      {/* 2. EDITORIAL HERO SECTION                            */}
      {/* ---------------------------------------------------- */}
      <section className="relative pt-16 pb-20 px-6 sm:px-12 bg-gradient-to-b from-slate-50/50 via-white to-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left Hero Narrative */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Official Rooman Technologies Consultation Portal</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-slate-950 tracking-tight leading-[1.1]">
              Accelerate your tech career.{' '}
              <span className="text-indigo-600">
                Book expert Rooman mentoring.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
              Connect directly with senior instructors from Rooman Technologies. Schedule 1-on-1 certification guidance, technical mock interviews, and university Center of Excellence (CoE) consultations in seconds.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link href="/book/rooman-technologies/career-guidance">
                <Button
                  size="lg"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl shadow-md shadow-indigo-600/20 transition-all"
                >
                  Book Free 1-on-1 Guidance
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>

              <Link
                href="/book/rooman-technologies"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-semibold text-sm transition-all hover:bg-slate-50"
              >
                <span>View All Services</span>
              </Link>
            </div>

            {/* Quiet trust markers */}
            <div className="flex flex-wrap items-center gap-6 pt-4 text-xs font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-indigo-600" />
                <span>100% Free Career Roadmap</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-indigo-600" />
                <span>Cisco, AWS & AI Certified Faculty</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-indigo-600" />
                <span>Automated Google Meet Video</span>
              </div>
            </div>
          </div>

          {/* Right Live Interactive Scheduler Preview */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-200/50 p-6 space-y-5">
              {/* Mentor Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-sm">
                    PS
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Priya Sharma</h2>
                    <span className="text-xs text-slate-500">Principal AI & Cloud Architect • Rooman</span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Slots Available
                </span>
              </div>

              {/* Service Offering Title */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">1-on-1 Career & Certification Guidance</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">FREE</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    30 mins
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-slate-400" />
                    Google Meet
                  </span>
                </div>
              </div>

              {/* Day Selection */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Select Day (IST)
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {['Today', 'Tomorrow', 'Thursday'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setDemoSelectedDay(day)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
                        demoSelectedDay === day
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/60'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Open Slots */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Select Open Slot
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {['10:30 AM', '02:00 PM', '04:30 PM', '06:00 PM'].map((time) => {
                    const isSelected = demoSelectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => handleDemoSlotClick(time)}
                        className={`p-2.5 rounded-lg text-xs font-semibold text-left flex items-center justify-between transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-50 hover:bg-indigo-50/80 text-slate-800 border border-slate-200/60'
                        }`}
                      >
                        <span>{time}</span>
                        <ArrowRight className="h-3 w-3 opacity-60" />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Confirmation Simulation */}
              {demoBooked && (
                <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2 border border-emerald-100 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Selected {demoSelectedDay} at {demoSelectedTime}! Loading reservation...</span>
                </div>
              )}

              {/* Bottom Real Action */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  Live Slot Verification
                </span>
                <Link
                  href="/book/rooman-technologies"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
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
      {/* 3. AIRY SOCIAL PROOF STRIP (NO CARD BOXES!)         */}
      {/* ---------------------------------------------------- */}
      <section className="py-12 border-y border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 items-center text-center md:text-left divide-y md:divide-y-0 md:divide-x divide-slate-100">
            <div className="pt-4 md:pt-0 md:px-4">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 block tracking-tight">1.5M+</span>
              <p className="text-xs text-slate-500 font-medium mt-1">Students & Professionals Trained</p>
            </div>

            <div className="pt-4 md:pt-0 md:px-6">
              <span className="text-3xl sm:text-4xl font-black text-indigo-600 block tracking-tight">1,000+</span>
              <p className="text-xs text-slate-500 font-medium mt-1">Hiring & Academic Partners</p>
            </div>

            <div className="pt-4 md:pt-0 md:px-6">
              <span className="text-3xl sm:text-4xl font-black text-emerald-600 block tracking-tight">98.4%</span>
              <p className="text-xs text-slate-500 font-medium mt-1">Placement Assistance Rate</p>
            </div>

            <div className="pt-4 md:pt-0 md:px-6">
              <span className="text-3xl sm:text-4xl font-black text-slate-900 block tracking-tight">25+ Yrs</span>
              <p className="text-xs text-slate-500 font-medium mt-1">IT Training Pioneer (Est. 1999)</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 4. EDITORIAL CONSULTATION TRACKS (NOT MONOTONOUS)   */}
      {/* ---------------------------------------------------- */}
      <section id="tracks" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Focused Pathways
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-2">
            Tailored consultations for students, colleges, and enterprise teams
          </h2>
          <p className="text-base text-slate-600 mt-3">
            Select the consultation track that matches your goals. Each session is led directly by certified Rooman domain experts.
          </p>
        </div>

        {/* Clean Editorial Rows instead of repetitive cards */}
        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {/* Row 1 */}
          <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-slate-50/50 transition-colors px-4 -mx-4 rounded-xl">
            <div className="md:col-span-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                  Free • 30 mins
                </span>
                <span className="text-xs text-slate-400">1-on-1 Video</span>
              </div>
              <h3 className="text-xl font-bold text-slate-950">IT Career & Certification Guidance</h3>
              <p className="text-xs text-slate-500">For fresh graduates & IT job aspirants</p>
            </div>

            <div className="md:col-span-5 text-sm text-slate-600 leading-relaxed">
              Personalized career roadmapping with senior advisors. Learn which certifications (Cisco CCNA, AWS Cloud, AI/ML, Red Hat) match industry hiring demand and placement drives.
            </div>

            <div className="md:col-span-3 flex justify-start md:justify-end">
              <Link href="/book/rooman-technologies/career-guidance">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-5 py-2.5 rounded-lg"
                >
                  Book Free Slot
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Row 2 */}
          <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-slate-50/50 transition-colors px-4 -mx-4 rounded-xl">
            <div className="md:col-span-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  ₹499 • 45 mins
                </span>
                <span className="text-xs text-slate-400">Includes Scorecard</span>
              </div>
              <h3 className="text-xl font-bold text-slate-950">Technical Mock Interview & Assessment</h3>
              <p className="text-xs text-slate-500">For students preparing for placement drives</p>
            </div>

            <div className="md:col-span-5 text-sm text-slate-600 leading-relaxed">
              Comprehensive live technical interview with a principal architect. Assesses coding, system design, or networking fundamentals with an actionable evaluation scorecard.
            </div>

            <div className="md:col-span-3 flex justify-start md:justify-end">
              <Link href="/book/rooman-technologies/mock-interview-assessment">
                <Button
                  size="sm"
                  variant="primary"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-5 py-2.5 rounded-lg shadow-sm"
                >
                  Schedule Interview
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Row 3 */}
          <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-slate-50/50 transition-colors px-4 -mx-4 rounded-xl">
            <div className="md:col-span-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                  Institutional MOU
                </span>
                <span className="text-xs text-slate-400">60 mins</span>
              </div>
              <h3 className="text-xl font-bold text-slate-950">University Center of Excellence (CoE)</h3>
              <p className="text-xs text-slate-500">For college principals, trustees & deans</p>
            </div>

            <div className="md:col-span-5 text-sm text-slate-600 leading-relaxed">
              Strategic consultation with Rooman Academic Directors to establish on-campus CoE labs, Cisco/AWS/Red Hat hardware infrastructure, and joint placement drives for students.
            </div>

            <div className="md:col-span-3 flex justify-start md:justify-end">
              <Link href="/book/rooman-technologies/university-coe-consultation">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold text-xs px-5 py-2.5 rounded-lg"
                >
                  Schedule CoE Briefing
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Row 4 */}
          <div className="py-8 grid grid-cols-1 md:grid-cols-12 gap-6 items-center hover:bg-slate-50/50 transition-colors px-4 -mx-4 rounded-xl">
            <div className="md:col-span-4 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  Enterprise Cohort
                </span>
                <span className="text-xs text-slate-400">45 mins</span>
              </div>
              <h3 className="text-xl font-bold text-slate-950">Corporate Workforce Upskilling</h3>
              <p className="text-xs text-slate-500">For CTOs, HR heads & engineering leads</p>
            </div>

            <div className="md:col-span-5 text-sm text-slate-600 leading-relaxed">
              Customized training programs to upskill software engineering and IT operations teams in Generative AI, Cloud Infrastructure, and Cyber Defense.
            </div>

            <div className="md:col-span-3 flex justify-start md:justify-end">
              <Link href="/book/rooman-technologies/corporate-upskilling-discovery">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-300 hover:bg-slate-100 text-slate-800 font-semibold text-xs px-5 py-2.5 rounded-lg"
                >
                  Discuss Corporate Cohort
                  <ArrowUpRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 5. HOW IT WORKS (CONNECTED TIMELINE - NO BOXED CARDS)*/}
      {/* ---------------------------------------------------- */}
      <section id="how-it-works" className="py-20 px-6 sm:px-12 bg-slate-50/70 border-y border-slate-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-16 gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
                Simple Process
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-2">
                How scheduling works
              </h2>
            </div>

            <div className="inline-flex p-1 rounded-lg bg-slate-200/80 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('STUDENTS')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'STUDENTS' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Students & Aspirants
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('INSTITUTIONAL')}
                className={`px-4 py-2 rounded-md transition-all ${
                  activeTab === 'INSTITUTIONAL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                For Universities & Corporates
              </button>
            </div>
          </div>

          {/* Timeline steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === 'STUDENTS' ? 'Choose Your Domain' : 'Define Institutional Scope'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {activeTab === 'STUDENTS'
                  ? 'Select your focus area: AI, Cloud Computing, Cybersecurity, or Cisco Networking. Pick a date & time in IST.'
                  : 'Select your objective: Center of Excellence setup, Faculty Development Program (FDP), or Corporate Upskilling cohort.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="h-10 w-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === 'STUDENTS' ? 'Share Background & Resume' : 'Direct Director Meeting'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {activeTab === 'STUDENTS'
                  ? 'Tell us your academic history and dream roles so the Rooman mentor can prepare personalized recommendations.'
                  : 'Meet directly with Rooman Academic Directors to review lab requirements, curriculum alignment, and placement support.'}
              </p>
            </div>

            <div className="space-y-3">
              <div className="h-10 w-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === 'STUDENTS' ? 'Instant Google Meet Video' : 'MOU & Lab Implementation'}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {activeTab === 'STUDENTS'
                  ? 'Receive immediate calendar invites and join your live video session with zero back-and-forth emails.'
                  : 'Finalize agreements and launch on-campus Center of Excellence labs backed by Rooman Technologies.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 6. TRANSPARENT PRICING & TIERS                      */}
      {/* ---------------------------------------------------- */}
      <section id="pricing" className="py-20 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="max-w-3xl mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Transparent Options
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-950 tracking-tight mt-2">
            Clear, accessible consultation options
          </h2>
          <p className="text-base text-slate-600 mt-2">
            Zero hidden costs. 100% free guidance for all students exploring IT certification paths.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Tier 1 */}
          <div className="p-8 rounded-2xl border border-slate-200 bg-white space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Career Guidance</h3>
              <p className="text-xs text-slate-500 mt-1">For fresh graduates and students</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">₹0</span>
              <span className="text-xs font-bold text-emerald-600 ml-1">FREE</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>30-minute 1-on-1 counseling</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>AI, Cloud & Cybersecurity roadmap</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Google Meet video call</span>
              </li>
            </ul>
            <Link href="/book/rooman-technologies/career-guidance" className="block w-full">
              <Button
                variant="outline"
                className="w-full py-2.5 text-xs font-semibold border-slate-200 hover:bg-slate-50"
              >
                Book Free Guidance
              </Button>
            </Link>
          </div>

          {/* Tier 2: Featured Pro */}
          <div className="p-8 rounded-2xl border-2 border-indigo-600 bg-white space-y-6 shadow-lg shadow-indigo-600/5 relative">
            <span className="absolute -top-3 left-6 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
              Most Popular
            </span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Mock Interview & Assessment</h3>
              <p className="text-xs text-slate-500 mt-1">For placement-ready candidates</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">₹499</span>
              <span className="text-xs text-slate-400">/ session</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>45-minute live technical interview</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Written evaluation scorecard</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Coding, cloud or networking drill</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>Resume & profile recommendations</span>
              </li>
            </ul>
            <Link href="/book/rooman-technologies/mock-interview-assessment" className="block w-full">
              <Button
                variant="primary"
                className="w-full py-2.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Schedule Mock Interview
              </Button>
            </Link>
          </div>

          {/* Tier 3 */}
          <div className="p-8 rounded-2xl border border-slate-200 bg-white space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Center of Excellence & Enterprise</h3>
              <p className="text-xs text-slate-500 mt-1">For universities & corporations</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">Custom</span>
              <span className="text-xs text-slate-400">MOU Based</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>60-minute executive briefing</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>On-campus CoE lab setup framework</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>Custom corporate cohort syllabus</span>
              </li>
            </ul>
            <Link href="/book/rooman-technologies/university-coe-consultation" className="block w-full">
              <Button
                variant="outline"
                className="w-full py-2.5 text-xs font-semibold border-slate-200 hover:bg-slate-50"
              >
                Schedule Partnership Call
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 7. CLEAN MINIMALIST FAQ ACCORDION                   */}
      {/* ---------------------------------------------------- */}
      <section id="faq" className="py-20 px-6 sm:px-12 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-600">
            Answers
          </span>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight mt-2">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="divide-y divide-slate-200 border-y border-slate-200">
          {[
            {
              q: 'Who conducts the 1-on-1 Career Guidance session?',
              a: 'Sessions are conducted directly by certified Rooman instructors and senior career mentors with extensive industry experience in AI/ML, Cloud Computing, Cybersecurity, and Cisco networking.',
            },
            {
              q: 'Is the initial career consultation really 100% free?',
              a: 'Yes. As part of Rooman Technologies mission to bridge the national IT skill gap, initial 30-minute career roadmapping sessions are completely free with no obligations.',
            },
            {
              q: 'What happens in a Technical Mock Interview?',
              a: 'You participate in a 45-minute technical simulation over Google Meet. You will be evaluated on technical knowledge, problem-solving approach, and communication, followed by an actionable written scorecard.',
            },
            {
              q: 'How do engineering colleges establish a Rooman Center of Excellence (CoE)?',
              a: 'College leadership can schedule an Executive CoE Discovery session. Our team details lab hardware requirements, Cisco/AWS/Red Hat curriculum integration, and joint placement support.',
            },
          ].map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={item.q} className="py-5">
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left font-bold text-sm text-slate-900 flex items-center justify-between hover:text-indigo-600 transition-colors"
                >
                  <span>{item.q}</span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-indigo-600 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 max-w-2xl">
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 8. BOTTOM CTA                                        */}
      {/* ---------------------------------------------------- */}
      <section className="py-16 px-6 sm:px-12 bg-slate-950 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Ready to take the next step in your tech career?
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Join over 1.5 million professionals trained by Rooman Technologies across India. Reserve your slot in under a minute.
          </p>
          <div className="pt-2 flex flex-wrap justify-center gap-4">
            <Link href="/book/rooman-technologies/career-guidance">
              <Button
                size="lg"
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-3 rounded-lg"
              >
                Book Free Guidance Session
              </Button>
            </Link>
            <Link href="/book/rooman-technologies">
              <Button
                size="lg"
                variant="outline"
                className="bg-transparent hover:bg-white/10 text-white border-white/20 font-semibold text-xs px-6 py-3 rounded-lg"
              >
                Browse All Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- */}
      {/* 9. REFINED FOOTER                                    */}
      {/* ---------------------------------------------------- */}
      <footer className="bg-white border-t border-slate-100 py-12 px-6 sm:px-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/rooman-logo.png"
              alt="Rooman Technologies"
              className="h-6 w-auto object-contain"
            />
            <span className="text-[11px] text-slate-400 pl-3 border-l border-slate-200">
              © {new Date().getFullYear()} Rooman Technologies Pvt. Ltd. Bengaluru, India.
            </span>
          </div>

          <div className="flex items-center gap-6 text-slate-600 font-medium">
            <Link href="/book/rooman-technologies" className="hover:text-slate-900 transition-colors">
              Booking Portal
            </Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Staff Sign In
            </Link>
            <a
              href="https://www.rooman.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-900 transition-colors flex items-center gap-1"
            >
              <span>rooman.com</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
