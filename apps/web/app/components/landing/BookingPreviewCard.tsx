'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

export interface BookingPreviewService {
  id: string;
  name: string;
  slug: string;
  durationMinutes: number;
  price: number;
  currency: string;
}

interface BookingPreviewCardProps {
  workspaceSlug: string;
  services?: BookingPreviewService[];
}

export function BookingPreviewCard({ workspaceSlug, services = [] }: BookingPreviewCardProps) {
  // Use real services if provided, otherwise default to representative labels (with no fake booking links)
  const availableServices =
    services.length > 0
      ? services
      : [
          {
            id: 'demo-1',
            name: 'Tech Career Consultation',
            slug: '',
            durationMinutes: 30,
            price: 0,
            currency: 'INR',
          },
          {
            id: 'demo-2',
            name: 'Cloud & DevOps Advisory',
            slug: '',
            durationMinutes: 45,
            price: 0,
            currency: 'INR',
          },
        ];

  const [selectedServiceId, setSelectedServiceId] = React.useState<string>(
    availableServices[0]?.id || ''
  );
  const [selectedDayIndex, setSelectedDayIndex] = React.useState<number>(1); // e.g., tomorrow selected in preview

  const selectedService =
    availableServices.find((s) => s.id === selectedServiceId) || availableServices[0];

  // Calendar dates preview (sample calendar days of current week, non-hardcoded times)
  const previewDays = React.useMemo(() => {
    const days = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      days.push({
        dayName: dayNames[d.getDay()],
        dateNum: d.getDate(),
        month: monthNames[d.getMonth()],
        isToday: i === 0,
      });
    }
    return days;
  }, []);

  // Construct booking target URL: direct to specific service if real slug exists, else workspace portal
  const targetUrl = selectedService?.slug
    ? `/book/${workspaceSlug}/${selectedService.slug}`
    : `/book/${workspaceSlug}`;

  const isFree = selectedService?.price === 0;

  return (
    <div className="relative w-full max-w-lg mx-auto lg:max-w-none rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-5 sm:p-6 transition-all duration-300">
      {/* Visual Accent Top Bar */}
      <div className="absolute -top-px left-8 right-8 h-1 bg-gradient-to-r from-[#5c34ad] via-[#8c65d3] to-[#5c34ad] rounded-t-full" />

      {/* Header with clear Preview Identifier */}
      <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[#5c34ad] animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Booking Experience Preview
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
          Representative UI
        </span>
      </div>

      {/* Step 1: Select Consultation Track */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Select Track
          </span>
          {isFree ? (
            <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
              Free Session
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-slate-500">
              {selectedService.currency} {selectedService.price}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableServices.slice(0, 2).map((srv) => {
            const isSelected = srv.id === selectedService?.id;
            return (
              <button
                key={srv.id}
                type="button"
                onClick={() => setSelectedServiceId(srv.id)}
                className={`text-left p-3 rounded-xl border transition-all text-xs ${
                  isSelected
                    ? 'border-[#5c34ad] bg-[#5c34ad]/5 text-[#5c34ad] shadow-xs'
                    : 'border-slate-200 bg-slate-50/60 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="font-semibold line-clamp-1">{srv.name}</div>
                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {srv.durationMinutes}m
                  </span>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <Video className="h-3 w-3" />
                    Online
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Date Selector (Interactive preview calendar dates) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            2. Choose Date
          </span>
          <span className="text-[11px] text-slate-400 flex items-center gap-1">
            <CalendarIcon className="h-3 w-3" />
            Calendar Preview
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
          {previewDays.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className={`py-2 px-1 rounded-xl text-center border transition-all ${
                  isSelected
                    ? 'border-[#5c34ad] bg-[#5c34ad] text-white shadow-xs'
                    : 'border-slate-200/80 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-100/50'
                }`}
              >
                <div
                  className={`text-[10px] font-medium uppercase ${isSelected ? 'text-white/80' : 'text-slate-400'}`}
                >
                  {day.dayName}
                </div>
                <div className="text-sm font-bold mt-0.5">{day.dateNum}</div>
                <div className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  {day.month}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 3: Time Slot Preview State (Explicitly non-live & informative) */}
      <div className="mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            3. Available Times
          </span>
          <span className="text-[11px] text-slate-400">Live on portal</span>
        </div>

        {/* Informative placeholder state per user rule: clearly labeled visual placeholder state */}
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3.5 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-[#5c34ad]" />
            <span>Available times appear here on the booking portal</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed max-w-xs mx-auto">
            Live availability is fetched dynamically according to mentor working hours and real-time
            calendar syncing.
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="mt-5 pt-3 border-t border-slate-100">
        <Link
          href={targetUrl}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-sm font-bold tracking-wide shadow-md hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#5c34ad]"
        >
          <span>{isFree ? 'Book a Free Session →' : 'Book a Session →'}</span>
        </Link>
        <p className="text-center text-[11px] text-slate-400 mt-2">
          Instant confirmation with Google Meet invitation
        </p>
      </div>
    </div>
  );
}
