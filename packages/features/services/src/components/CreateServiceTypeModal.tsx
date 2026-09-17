'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Users,
  Network,
  Monitor,
  X,
  Info,
  ChevronRight,
  Sparkles,
  Calendar,
  Repeat,
} from 'lucide-react';

export type ServiceTypeId =
  'ONE_ON_ONE' | 'GROUP_BOOKING' | 'COLLECTIVE_BOOKING' | 'RESOURCE_BOOKING';

interface ServiceTypeOption {
  id: ServiceTypeId;
  title: string;
  badge?: string;
  description: string;
  subtags?: string[];
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderHover: string;
  bgHover: string;
  routeParam: string;
  comingSoon?: boolean;
}

const SERVICE_TYPE_OPTIONS: ServiceTypeOption[] = [
  {
    id: 'ONE_ON_ONE',
    title: 'One on One',
    description: 'Ideal for support calls, client meetings, and any one-to-one meetings',
    subtags: ['1:1 Consultations', 'Direct Video / Phone'],
    icon: User,
    iconBg: 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300',
    iconColor: 'text-purple-600',
    borderHover: 'hover:border-purple-300 dark:hover:border-purple-700',
    bgHover: 'hover:bg-purple-50/40 dark:hover:bg-purple-950/20',
    routeParam: 'one-on-one',
  },
  {
    id: 'GROUP_BOOKING',
    title: 'Group Booking',
    description: 'Ideal for workshops, webinars, and classes',
    subtags: ['One Time', 'Recurring', 'Seat Limits'],
    icon: Users,
    iconBg: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    iconColor: 'text-blue-600',
    borderHover: 'hover:border-blue-300 dark:hover:border-blue-700',
    bgHover: 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20',
    routeParam: 'group',
  },
  {
    id: 'COLLECTIVE_BOOKING',
    title: 'Collective Booking',
    description: 'Ideal for panel interviews, board meetings, and any many-to-one meetings',
    subtags: ['All Hosts Required', 'Joint Schedules'],
    icon: Network,
    iconBg: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
    iconColor: 'text-indigo-600',
    borderHover: 'hover:border-indigo-300 dark:hover:border-indigo-700',
    bgHover: 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20',
    routeParam: 'collective',
  },
  {
    id: 'RESOURCE_BOOKING',
    title: 'Resource Booking',
    description: 'Ideal for conference room bookings and equipment rentals',
    subtags: ['Rooms & Spaces', 'Equipment Slots'],
    icon: Monitor,
    iconBg: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    iconColor: 'text-amber-600',
    borderHover: 'hover:border-amber-300 dark:hover:border-amber-700',
    bgHover: 'hover:bg-amber-50/40 dark:hover:bg-amber-950/20',
    routeParam: 'resource',
  },
];

interface CreateServiceTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateServiceTypeModal({ isOpen, onClose }: CreateServiceTypeModalProps) {
  const router = useRouter();

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelectType = (option: ServiceTypeOption) => {
    if (option.comingSoon) return;
    onClose();
    router.push(`/services/new?type=${option.routeParam}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in-50 duration-200">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              Create New Service Type
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select the format that matches how you deliver appointments or allocate resources.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Options List */}
        <div className="p-6 space-y-3.5 max-h-[75vh] overflow-y-auto">
          {SERVICE_TYPE_OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <div
                key={option.id}
                role="button"
                tabIndex={option.comingSoon ? -1 : 0}
                aria-disabled={option.comingSoon}
                onClick={() => handleSelectType(option)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelectType(option);
                  }
                }}
                className={`group relative flex items-start gap-4 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/40 transition-all text-left focus:outline-none focus:ring-2 focus:ring-purple-500/40 ${
                  option.comingSoon
                    ? 'opacity-60 cursor-not-allowed'
                    : `cursor-pointer hover:shadow-md ${option.borderHover} ${option.bgHover}`
                }`}
              >
                {/* Icon */}
                <div
                  className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${option.iconBg} ${option.comingSoon ? '' : 'group-hover:scale-105'} transition-transform`}
                >
                  <Icon className="h-6 w-6" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-bold text-slate-900 dark:text-slate-100 text-sm transition-colors ${option.comingSoon ? '' : 'group-hover:text-purple-600 dark:group-hover:text-purple-400'}`}
                    >
                      {option.title}
                    </span>
                    {option.comingSoon ? (
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Coming soon
                      </span>
                    ) : (
                      <Info className="h-3.5 w-3.5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {option.description}
                  </p>

                  {/* Subtag Badges */}
                  {option.subtags && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {option.subtags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Arrow indicator */}
                {!option.comingSoon && (
                  <div className="self-center pr-1 text-slate-300 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
            <span>You can customize pricing, duration, and routing for every service type.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
