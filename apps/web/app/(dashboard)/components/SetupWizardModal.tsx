'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  X,
  CheckCircle2,
  Circle,
  Building,
  Clock,
  Tag,
  Share2,
  ArrowRight,
  ExternalLink,
  Copy,
  Layers,
} from 'lucide-react';

export interface SetupStep {
  id: number;
  title: string;
  description: string;
  icon: any;
  href: string;
  isCompleted: boolean;
}

interface SetupWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
  workspaceSlug: string;
  /**
   * Steps already satisfied, derived from real workspace data by the server.
   * Progress is not user-togglable: a checklist you can tick without doing the
   * work reports a setup state that is not true.
   */
  completedSteps: number[];
}

export function SetupWizardModal({
  isOpen,
  onClose,
  workspaceName,
  workspaceSlug,
  completedSteps: activeCompletedSteps,
}: SetupWizardModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const steps: SetupStep[] = [
    {
      id: 1,
      title: '1. Business & Regional Details',
      description: 'Confirm your business name, operating currency, and default timezone.',
      icon: Building,
      href: '/settings',
      isCompleted: activeCompletedSteps.includes(1),
    },
    {
      id: 2,
      title: '2. Working Hours & Shift Rules',
      description:
        'Define your team availability (e.g. Mon–Fri 09:00–17:00) and lunch break intervals.',
      icon: Clock,
      href: '/schedules',
      isCompleted: activeCompletedSteps.includes(2),
    },
    {
      id: 3,
      title: '3. Event Types & Buffer Protection',
      description: 'Set up your 1-on-1 consultation services with 15-minute prep and wrap buffers.',
      icon: Tag,
      href: '/event-types',
      isCompleted: activeCompletedSteps.includes(3),
    },
    {
      id: 4,
      title: '4. Share & Embed Booking Page',
      description:
        'Share your public booking link with clients or embed the widget on your website.',
      icon: Share2,
      href: '/booking-pages',
      isCompleted: activeCompletedSteps.includes(4),
    },
  ];

  const completedCount = activeCompletedSteps.length;
  const progressPercent = Math.round((completedCount / 4) * 100);

  const bookingUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/book/${workspaceSlug}`
      : `http://localhost:3000/book/${workspaceSlug}`;

  const copyShareLink = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Professional Layered Header */}
        <div className="bg-slate-900 text-white p-6 relative border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-purple-400" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
              Account Onboarding Checklist
            </span>
          </div>

          <h2 className="text-lg font-bold text-white tracking-tight">
            Complete Organization Setup
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed">
            Follow these essential configuration steps to prepare your organization to accept client
            appointments.
          </p>

          {/* Progress Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold text-slate-300">
            <span>{completedCount} of 4 Steps Completed</span>
            <span className="text-purple-400">{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
            <div
              className="h-full bg-[#5c34ad] rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Steps List */}
        <div className="p-6 space-y-3 bg-slate-50/50 max-h-[60vh] overflow-y-auto">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.id}
                className={`p-4 rounded-2xl border transition-all ${
                  step.isCompleted
                    ? 'bg-white border-emerald-200 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 shrink-0"
                      title={step.isCompleted ? 'Completed' : 'Not yet configured'}
                    >
                      {step.isCompleted ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 fill-emerald-50" />
                      ) : (
                        <Circle className="h-5 w-5 text-slate-300" />
                      )}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-[#5c34ad]" />
                        <h3
                          className={`text-xs font-bold ${step.isCompleted ? 'text-slate-800' : 'text-slate-900'}`}
                        >
                          {step.title}
                        </h3>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <Link
                    href={step.href}
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#5c34ad] hover:text-[#4d2994] px-2.5 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors shrink-0"
                  >
                    <span>Configure</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Inline Quick Action for Step 4 (Share) */}
                {step.id === 4 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                    <div className="font-mono text-[11px] text-slate-600 truncate bg-slate-100 px-2.5 py-1 rounded-md max-w-xs">
                      {bookingUrl}
                    </div>
                    <button
                      type="button"
                      onClick={copyShareLink}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-[#5c34ad] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-[#4d2994] transition-colors"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            {completedCount === 4 ? '🎉 All steps completed!' : 'Click any step to configure'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition-colors"
          >
            Close Wizard
          </button>
        </div>
      </div>
    </div>
  );
}
