'use client';

import * as React from 'react';
import { CalendarCheck, MousePointerClick, Video, Check } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      icon: MousePointerClick,
      title: 'Choose a Service',
      description:
        'Select the career consultation, certification review, or enterprise pathway aligned with your career aspirations.',
    },
    {
      number: '02',
      icon: CalendarCheck,
      title: 'Pick Your Date & Time',
      description:
        'Browse real-time mentor availability and select a slot that fits seamlessly into your schedule.',
    },
    {
      number: '03',
      icon: Video,
      title: 'Connect 1-on-1',
      description:
        'Join your private Google Meet session with an experienced mentor and receive personalized action plans.',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 sm:py-28 bg-slate-50/50 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] text-xs font-bold uppercase tracking-wider">
            <span>Process</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Simple, seamless scheduling
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Book your 1-on-1 session in three straightforward steps.
          </p>
        </div>

        {/* Stepper Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting line on desktop */}
          <div className="hidden md:block absolute top-1/3 left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-slate-200 -z-0" />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={idx}
                className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs hover:shadow-md transition-shadow"
              >
                {/* Step Number & Icon */}
                <div className="flex items-center justify-between w-full mb-6">
                  <div className="h-12 w-12 rounded-xl bg-[#5c34ad]/10 text-[#5c34ad] flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-3xl font-black text-slate-200 tracking-tight">
                    {step.number}
                  </span>
                </div>

                {/* Step Content */}
                <h3 className="text-xl font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
