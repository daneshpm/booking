'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Clock,
  Video,
  Phone,
  MapPin,
  ArrowRight,
  Sparkles,
  BookOpen,
  Layers,
  CheckCircle,
} from 'lucide-react';

const LOCATION_TYPE_LABELS: Record<string, { label: string; icon: typeof Video }> = {
  ONLINE_MEETING: { label: 'Online Session', icon: Video },
  IN_PERSON_BUSINESS: { label: 'In-Person (Our Location)', icon: MapPin },
  IN_PERSON_CUSTOMER: { label: 'In-Person (Your Location)', icon: MapPin },
  PHONE_CALL: { label: 'Phone Call', icon: Phone },
};

export interface ServiceCardData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  currency: string;
  locationType?: string;
}

interface ServicesSectionProps {
  workspaceSlug: string;
  services?: ServiceCardData[];
}

export function ServicesSection({ workspaceSlug, services = [] }: ServicesSectionProps) {
  const hasServices = services.length > 0;

  return (
    <section
      id="services"
      className="py-20 sm:py-28 bg-white border-y border-slate-100 scroll-mt-16"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] text-xs font-bold uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5" />
            <span>Consultation Programs</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            How can we help you?
          </h2>
          <p className="text-base sm:text-lg text-slate-600">
            Choose the consultation or training pathway that matches your goals. Get personalized
            guidance from domain specialists.
          </p>
        </div>

        {/* Real Services Grid or Neutral State */}
        {hasServices ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {services.map((service) => {
              const isFree = service.price === 0;
              const bookingUrl = `/book/${workspaceSlug}/${service.slug}`;
              const locationInfo =
                LOCATION_TYPE_LABELS[service.locationType || 'ONLINE_MEETING'] ||
                LOCATION_TYPE_LABELS.ONLINE_MEETING;
              const LocationIcon = locationInfo.icon;

              return (
                <div
                  key={service.id}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-xs hover:shadow-xl hover:border-[#5c34ad]/40 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Subtle top indicator hover line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#5c34ad] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="space-y-4">
                    {/* Top Row: Format & Price Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600">
                        <LocationIcon className="h-3 w-3 text-slate-500" />
                        {locationInfo.label}
                      </span>
                      {isFree ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Free
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {service.currency} {service.price}
                        </span>
                      )}
                    </div>

                    {/* Service Title */}
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-[#5c34ad] transition-colors line-clamp-2">
                      {service.name}
                    </h3>

                    {/* Service Description */}
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {service.description ||
                        '1-on-1 personalized advisory with experienced instructors, career guidance, and practical next steps.'}
                    </p>

                    {/* Details List */}
                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-[#5c34ad]" />
                        <span>{service.durationMinutes} minutes dedicated duration</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Calendar invite with Google Meet link</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Link */}
                  <div className="pt-6 mt-4">
                    <Link
                      href={bookingUrl}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 group-hover:bg-[#5c34ad] text-white text-xs font-bold tracking-wide shadow-xs transition-colors"
                    >
                      <span>{isFree ? 'Book a Free Session →' : 'Book a Session →'}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Neutral Empty/Development State per requirement #2 */
          <div className="max-w-xl mx-auto rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Consultation Programs Updating</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Consultation pathways are currently being scheduled. Visit the booking portal to
                check upcoming availability or connect with our support team.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href={`/book/${workspaceSlug}`}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold transition-all"
              >
                <span>Visit Booking Portal</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
