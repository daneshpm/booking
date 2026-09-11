'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface FinalCtaSectionProps {
  workspaceSlug: string;
}

export function FinalCtaSection({ workspaceSlug }: FinalCtaSectionProps) {
  const bookUrl = `/book/${workspaceSlug}`;

  return (
    <section className="py-20 sm:py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-gradient-to-r from-[#3e1f7d] via-[#5c34ad] to-[#452086] text-white p-8 sm:p-12 lg:p-16 overflow-hidden shadow-2xl shadow-[#5c34ad]/20">
          {/* Subtle Decorative Ambient Elements */}
          <div
            className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-2xl"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#8c65d3]/20 blur-2xl"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs text-white text-xs font-bold tracking-wide border border-white/20">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              <span>Step forward in your career journey</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Ready to accelerate your career in technology?
            </h2>

            <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              Book your personalized consultation session today and get actionable direction from
              industry veterans.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href={bookUrl}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-[#5c34ad] text-sm font-bold shadow-lg hover:bg-slate-50 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Book a Session →</span>
              </Link>
              <a
                href="#services"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold border border-white/20 backdrop-blur-xs transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span>Explore All Programs</span>
              </a>
            </div>

            {/* Micro Guarantees */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-white/70 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Instant Google Meet invite</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>100% 1-on-1 private advisory</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Actionable next steps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
