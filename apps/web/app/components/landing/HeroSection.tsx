'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles, Users, Calendar } from 'lucide-react';
import { BookingPreviewCard, BookingPreviewService } from './BookingPreviewCard';

interface HeroSectionProps {
  workspaceSlug: string;
  services?: BookingPreviewService[];
}

export function HeroSection({ workspaceSlug, services = [] }: HeroSectionProps) {
  const hasFreeService = services.some((s) => s.price === 0);
  const bookUrl = `/book/${workspaceSlug}`;

  return (
    <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32 bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
      {/* Subtle Background Glows */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 -z-10 h-[500px] w-[900px] rounded-full bg-gradient-to-tr from-[#5c34ad]/10 via-[#8c65d3]/10 to-transparent blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute top-1/2 -right-40 -z-10 h-[400px] w-[500px] rounded-full bg-[#5c34ad]/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          {/* Left Column: Headline, Value Proposition, & CTAs */}
          <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
            {/* Top Pill / Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#5c34ad]/10 border border-[#5c34ad]/20 text-[#5c34ad] text-xs font-bold tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official Rooman Technologies Consultation Portal</span>
            </div>

            {/* Main Headline */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.15]">
                Get expert guidance.{' '}
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#5c34ad] via-[#7b4bd6] to-[#5c34ad]">
                  Build your next career move.
                </span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              Book 1-on-1 consultations with Rooman Technologies industry specialists across Cloud,
              Cybersecurity, AI/ML, and Enterprise Tech Pathways.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                href={bookUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-sm font-bold shadow-lg shadow-[#5c34ad]/25 hover:shadow-xl hover:shadow-[#5c34ad]/30 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#5c34ad]"
              >
                <span>Book a Session →</span>
              </Link>
              <a
                href="#services"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5c34ad]"
              >
                <span>Explore Programs</span>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="pt-6 border-t border-slate-200/70 flex flex-wrap items-center justify-center lg:justify-start gap-y-3 gap-x-6 text-xs sm:text-sm font-medium text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>
                  {hasFreeService ? 'Free Consultation Options' : 'Direct 1-on-1 Mentorship'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Experienced Industry Mentors</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Flexible Online Sessions</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Booking Preview Card */}
          <div className="lg:col-span-5 flex justify-center">
            <BookingPreviewCard workspaceSlug={workspaceSlug} services={services} />
          </div>
        </div>
      </div>
    </section>
  );
}
