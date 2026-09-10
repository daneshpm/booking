'use client';

import * as React from 'react';
import Link from 'next/link';
import { Award, Building2, GraduationCap, ShieldCheck, ArrowRight } from 'lucide-react';

interface CentersOfExcellenceSectionProps {
  workspaceSlug: string;
}

export function CentersOfExcellenceSection({ workspaceSlug }: CentersOfExcellenceSectionProps) {
  const highlights = [
    {
      icon: Building2,
      stat: '100+',
      title: 'Centers of Excellence',
      description:
        'Established advanced technological infrastructure and labs across leading academic institutions and universities.',
    },
    {
      icon: Award,
      stat: '30+',
      title: 'Years of Technical Legacy',
      description:
        'Three decades of pioneering IT education, hardware, networking, and emerging software domain mastery.',
    },
    {
      icon: ShieldCheck,
      stat: 'NSDC',
      title: 'National Skilling Partner',
      description:
        'Government-recognized training partner delivering industry-aligned certifications and job-ready competencies.',
    },
    {
      icon: GraduationCap,
      stat: '1M+',
      title: 'Students & Professionals Trained',
      description:
        'Empowering learners and corporate workforces nationwide with high-impact vocational and digital credentials.',
    },
  ];

  return (
    <section
      id="coe"
      className="py-20 sm:py-28 bg-slate-900 text-white scroll-mt-16 relative overflow-hidden"
    >
      {/* Background Decorative Gradient Orbs */}
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[#5c34ad]/20 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-[#8c65d3]/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5c34ad]/30 text-[#c8b3ff] text-xs font-bold uppercase tracking-wider border border-[#5c34ad]/40">
            <span>Institutional Strength</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Centers of Excellence & University Partnerships
          </h2>
          <p className="text-base sm:text-lg text-slate-300">
            Rooman Technologies establishes world-class technical infrastructure, lab ecosystems,
            and industry-aligned curricula.
          </p>
        </div>

        {/* Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {highlights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-slate-800 bg-slate-800/60 backdrop-blur-xs p-6 flex flex-col justify-between hover:border-[#5c34ad]/60 transition-all group"
              >
                <div>
                  <div className="h-12 w-12 rounded-xl bg-[#5c34ad]/20 text-[#c8b3ff] flex items-center justify-center mb-6 group-hover:scale-105 transition-transform">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="text-3xl font-extrabold text-white tracking-tight mb-1">
                    {item.stat}
                  </div>
                  <h3 className="text-base font-bold text-slate-200 mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Link */}
        <div className="mt-14 text-center">
          <Link
            href={`/book/${workspaceSlug}`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold tracking-wide shadow-lg transition-all"
          >
            <span>Schedule an Institutional or Career Consultation →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
