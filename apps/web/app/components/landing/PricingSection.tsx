'use client';

import * as React from 'react';
import Link from 'next/link';
import { Check, Sparkles } from 'lucide-react';

export interface PlanCardData {
  id: string;
  name: string;
  price: string;
  currency: string;
  billingPeriod: 'MONTHLY' | 'YEARLY';
  features: string[];
}

interface PricingSectionProps {
  plans?: PlanCardData[];
}

export function PricingSection({ plans = [] }: PricingSectionProps) {
  if (plans.length === 0) return null;

  return (
    <section id="pricing" className="py-20 sm:py-28 bg-slate-50 scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] text-xs font-bold uppercase tracking-wider">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Pricing</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Plans for every organization
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Simple, transparent pricing. Reach out to switch plans at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
          {plans.map((plan) => {
            const isFree = Number(plan.price) === 0;
            return (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl border border-slate-200/90 bg-white p-7 shadow-xs hover:shadow-xl hover:border-[#5c34ad]/40 transition-all duration-300"
              >
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  {isFree ? (
                    <span className="text-3xl font-extrabold text-slate-900">Free</span>
                  ) : (
                    <>
                      <span className="text-3xl font-extrabold text-slate-900">
                        {plan.currency} {plan.price}
                      </span>
                      <span className="text-sm text-slate-500">
                        /{plan.billingPeriod === 'MONTHLY' ? 'month' : 'year'}
                      </span>
                    </>
                  )}
                </div>

                <ul className="mt-6 space-y-2.5 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className="mt-7 w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-[#5c34ad] text-white text-xs font-bold tracking-wide shadow-xs transition-colors"
                >
                  Get started
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
