'use client';

import * as React from 'react';
import { CheckCircle, Briefcase, Cpu, GraduationCap, CalendarCheck2, Compass } from 'lucide-react';

export function WhyRoomanSection() {
  const points = [
    {
      icon: Briefcase,
      title: 'Expert-Led Advisory',
      description:
        'Consultations conducted by seasoned technical educators and practitioners with deep industry exposure.',
    },
    {
      icon: Cpu,
      title: 'Enterprise & Industry Aligned',
      description:
        'Practical knowledge grounded in industry-standard technologies across Cloud, Security, AI/ML, and Networking.',
    },
    {
      icon: GraduationCap,
      title: 'Recognized Credentials',
      description:
        'Guidance structured around industry-accepted certifications and government-recognized vocational standards.',
    },
    {
      icon: Compass,
      title: 'Tailored Career Pathways',
      description:
        'Clear, step-by-step career roadmaps customized to your current skills, background, and target roles.',
    },
    {
      icon: CheckCircle,
      title: 'Practical Hands-On Focus',
      description:
        'Action-oriented recommendations designed to prepare you for real-world technical lab environments.',
    },
    {
      icon: CalendarCheck2,
      title: 'Seamless Digital Scheduling',
      description:
        'Frictionless booking experience with instant calendar invites, Google Meet links, and proactive notifications.',
    },
  ];

  return (
    <section className="py-20 sm:py-28 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] text-xs font-bold uppercase tracking-wider">
            <span>The Rooman Advantage</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Built on 30+ Years of Technical Excellence
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Why aspiring professionals, enterprise teams, and academic institutions rely on Rooman
            for career transformation.
          </p>
        </div>

        {/* 6 Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {points.map((point, idx) => {
            const Icon = point.icon;
            return (
              <div
                key={idx}
                className="flex gap-4 p-6 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:border-slate-200 hover:shadow-md transition-all"
              >
                <div className="h-10 w-10 shrink-0 rounded-xl bg-[#5c34ad]/10 text-[#5c34ad] flex items-center justify-center">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900">{point.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {point.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
