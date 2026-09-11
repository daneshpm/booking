'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  Clock,
  DollarSign,
  MapPin,
  Video,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarPlus,
  Download,
  RotateCcw,
  Trash2,
  ExternalLink,
  Loader2,
  Sparkles,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { Button, Badge, Textarea } from '@bookings/ui';
import {
  rescheduleBookingByManageTokenAction,
  cancelBookingByManageTokenAction,
  getAvailableSlotsAction,
  type AvailableSlot,
} from '../../actions';

interface ManageBookingClientProps {
  token: string;
  initialBooking: {
    id: string;
    manageToken?: string | null;
    status: string;
    startTimeIso?: string;
    endTimeIso?: string;
    formattedDate: string;
    formattedTime: string;
    timezone: string;
    meetingLink?: string | null;
    cancellationReason?: string | null;
    paidPrice?: number;
    currency?: string;
    service: {
      id: string;
      name: string;
      slug?: string;
      description?: string | null;
      durationMinutes: number;
      price?: any;
      locationType: string;
      locationDetails?: string | null;
    };
    staff: {
      id: string;
      name: string;
      email: string;
    };
    customer: {
      name: string;
      email: string;
      phone?: string | null;
    };
    workspace: {
      id: string;
      name: string;
      slug: string;
    };
    selectedAddons?: Array<{ id: string; name: string; durationMinutes: number; price: number }>;
    intakeResponses?: Record<string, any> | null;
    googleCalendarUrl?: string;
    outlookCalendarUrl?: string;
    icsContent?: string;
  };
}

export function ManageBookingClient({ token, initialBooking }: ManageBookingClientProps) {
  const [booking, setBooking] = React.useState(initialBooking);
  const [isRescheduling, setIsRescheduling] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);

  // Reschedule state
  const availableDates = React.useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const labelDay = d.toLocaleDateString('en-US', { weekday: 'short' });
        const labelDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dates.push({ dateStr, labelDay, labelDate });
      }
    }
    return dates;
  }, []);

  const [rescheduleDate, setRescheduleDate] = React.useState<string>(
    availableDates[0]?.dateStr || ''
  );
  const [rescheduleTime, setRescheduleTime] = React.useState<string | null>(null);
  const [slots, setSlots] = React.useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = React.useState(false);
  const [submittingReschedule, setSubmittingReschedule] = React.useState(false);
  const [rescheduleError, setRescheduleError] = React.useState<string | null>(null);
  const [rescheduleSuccess, setRescheduleSuccess] = React.useState<string | null>(null);

  // Cancellation state
  const [cancelReason, setCancelReason] = React.useState('');
  const [submittingCancel, setSubmittingCancel] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Fetch slots for reschedule date
  React.useEffect(() => {
    if (!isRescheduling || !rescheduleDate) return;
    let isMounted = true;
    async function load() {
      setLoadingSlots(true);
      setRescheduleError(null);
      try {
        const res = await getAvailableSlotsAction(
          booking.workspace.id,
          booking.service.id,
          rescheduleDate,
          booking.staff.id,
          booking.selectedAddons?.map((a) => a.id) || []
        );
        if (isMounted) {
          if (res.success) {
            setSlots(res.slots);
          } else {
            setSlots([]);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setSlots([]);
          setRescheduleError('Failed to load slots.');
        }
      } finally {
        if (isMounted) setLoadingSlots(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [isRescheduling, rescheduleDate, booking.workspace.id, booking.service.id]);

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError('Please select a new date and time.');
      return;
    }
    setSubmittingReschedule(true);
    setRescheduleError(null);
    try {
      const res = await rescheduleBookingByManageTokenAction(token, rescheduleDate, rescheduleTime);
      if (res.success) {
        setRescheduleSuccess('Your appointment has been successfully rescheduled!');
        setBooking((prev) => ({
          ...prev,
          formattedDate: res.formattedDate || prev.formattedDate,
          formattedTime: res.formattedTime || prev.formattedTime,
        }));
        setIsRescheduling(false);
        setRescheduleTime(null);
      } else {
        setRescheduleError(res.error || 'Failed to reschedule.');
      }
    } catch (err: any) {
      setRescheduleError(err.message || 'An error occurred.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleCancelSubmit = async () => {
    setSubmittingCancel(true);
    setCancelError(null);
    try {
      const res = await cancelBookingByManageTokenAction(token, cancelReason);
      if (res.success) {
        setBooking((prev) => ({
          ...prev,
          status: 'CANCELLED',
          cancellationReason: cancelReason || 'Cancelled by customer',
        }));
        setIsCancelling(false);
      } else {
        setCancelError(res.error || 'Failed to cancel appointment.');
      }
    } catch (err: any) {
      setCancelError(err.message || 'An error occurred.');
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleDownloadICS = () => {
    if (!booking.icsContent) return;
    const blob = new Blob([booking.icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `${booking.service.name.replace(/[^a-zA-Z0-9]/g, '_')}_appointment.ics`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-600/20">
            {booking.workspace.name.charAt(0)}
          </div>
          <div>
            <span className="text-sm font-bold text-slate-900 block">{booking.workspace.name}</span>
            <span className="text-[11px] text-slate-500 font-medium">
              Self-Service Appointment Portal
            </span>
          </div>
        </div>

        <Link href={`/book/${booking.workspace.slug}`}>
          <Button
            variant="outline"
            size="sm"
            className="text-xs bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs"
          >
            All Services
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full space-y-6">
        {rescheduleSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2.5 font-semibold animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{rescheduleSuccess}</span>
          </div>
        )}

        {/* Primary Booking Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
              <div>
                <div className="flex items-center gap-2.5 mb-1.5">
                  <Badge
                    variant={isCancelled ? 'danger' : 'success'}
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isCancelled
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    }`}
                  >
                    {isCancelled ? 'Cancelled' : 'Confirmed'}
                  </Badge>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Booking ID: #{booking.id.slice(-6).toUpperCase()}
                  </span>
                </div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {booking.service.name}
                </h1>
              </div>

              {!isCancelled && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsRescheduling(!isRescheduling);
                      setIsCancelling(false);
                    }}
                    className="text-xs gap-1.5 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-indigo-600" />
                    Reschedule
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCancelling(!isCancelling);
                      setIsRescheduling(false);
                    }}
                    className="text-xs gap-1.5 bg-white border-rose-200 hover:bg-rose-50 text-rose-700 shadow-2xs"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>

            {/* Cancelled Banner */}
            {isCancelled && (
              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 space-y-1">
                <span className="font-bold flex items-center gap-1.5">
                  <XCircle className="h-4 w-4 text-rose-600" />
                  This appointment has been cancelled
                </span>
                {booking.cancellationReason && (
                  <p className="text-[11px] text-rose-700 ml-5.5">
                    Reason: {booking.cancellationReason}
                  </p>
                )}
              </div>
            )}

            {/* Appointment Schedule & Staff Meta */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Date & Time
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <CalendarIcon className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>
                    {booking.formattedDate} ({booking.formattedTime})
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block pt-0.5">
                  Timezone: {booking.timezone}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Advisor / Staff
                </span>
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <User className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>{booking.staff.name}</span>
                </div>
                <span className="text-[10px] text-slate-500 block pt-0.5">
                  {booking.staff.email}
                </span>
              </div>
            </div>

            {/* Location */}
            {booking.meetingLink ? (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Video className="h-4 w-4 text-indigo-600 shrink-0" />
                  <div>
                    <span className="font-bold text-slate-900 block">Online Video Meeting</span>
                    <span className="text-[11px] text-slate-500">Google Meet</span>
                  </div>
                </div>
                <a
                  href={booking.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-all"
                >
                  Join Meeting
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : booking.service.locationDetails ? (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-2.5 text-xs text-slate-700">
                <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
                <span>{booking.service.locationDetails}</span>
              </div>
            ) : null}

            {/* Extras / Add-ons List */}
            {booking.selectedAddons && booking.selectedAddons.length > 0 && (
              <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  Selected Add-ons & Extras
                </span>
                <div className="space-y-1.5 pt-1">
                  {booking.selectedAddons.map((addon, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center text-xs text-slate-700"
                    >
                      <span>• {addon.name}</span>
                      <span className="font-semibold text-slate-900">
                        {addon.durationMinutes ? `+${addon.durationMinutes}m` : ''}{' '}
                        {addon.price ? `+$${Number(addon.price).toFixed(2)}` : 'Free'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Intake Responses */}
            {booking.intakeResponses && Object.keys(booking.intakeResponses).length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/90 space-y-2.5 text-xs">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  Pre-Appointment Answers
                </span>
                <div className="space-y-2 pt-1">
                  {Object.entries(booking.intakeResponses).map(([key, val]) => (
                    <div key={key} className="bg-white p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[11px] text-slate-500 font-medium block">
                        Question / Response:
                      </span>
                      <span className="text-xs font-semibold text-slate-900 block mt-0.5">
                        {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 1-Click Universal Calendar Exports */}
            {!isCancelled && (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50/50 via-purple-50/30 to-white border border-indigo-200/80 space-y-3">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CalendarPlus className="h-4 w-4 text-indigo-600" />
                  Add to Your Calendar
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {booking.googleCalendarUrl && (
                    <a
                      href={booking.googleCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-xs font-semibold text-slate-700 hover:text-indigo-600 shadow-2xs transition-all"
                    >
                      Google
                    </a>
                  )}
                  {booking.outlookCalendarUrl && (
                    <a
                      href={booking.outlookCalendarUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-xs font-semibold text-slate-700 hover:text-indigo-600 shadow-2xs transition-all"
                    >
                      Outlook
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleDownloadICS}
                    className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-xs font-semibold text-slate-700 hover:text-indigo-600 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="h-3 w-3" />
                    iCal (.ics)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Reschedule Drawer Section */}
        {isRescheduling && !isCancelled && (
          <div className="bg-white rounded-3xl border border-indigo-300 shadow-md p-6 sm:p-8 space-y-5 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <RotateCcw className="h-4 w-4 text-indigo-600" />
                  Choose a New Date & Time
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select an open slot to move your appointment with {booking.staff.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRescheduling(false)}
                className="text-xs text-slate-400 hover:text-slate-700 font-medium"
              >
                Close
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {rescheduleError}
              </div>
            )}

            {/* Available Dates */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-2">Select Date</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {availableDates.map((item) => {
                  const isSelected = rescheduleDate === item.dateStr;
                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => {
                        setRescheduleDate(item.dateStr);
                        setRescheduleTime(null);
                      }}
                      className={`flex flex-col items-center justify-center min-w-[70px] py-2.5 px-2 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-md shadow-indigo-600/25'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                        {item.labelDay}
                      </span>
                      <span className="text-xs font-bold mt-0.5">{item.labelDate}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">
                  Available Times for {rescheduleDate}
                </label>
                {loadingSlots && (
                  <div className="flex items-center gap-1.5 text-[11px] text-indigo-600 font-medium">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading shifts...</span>
                  </div>
                )}
              </div>

              {loadingSlots ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 rounded-xl bg-slate-100 border border-slate-200 animate-pulse"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="p-5 text-center rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
                  No slots available on this date. Please select another day.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {slots.map((s) => {
                    const isSelected = rescheduleTime === s.time;
                    return (
                      <button
                        key={s.time}
                        type="button"
                        onClick={() => setRescheduleTime(s.time)}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 text-slate-800'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRescheduling(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!rescheduleTime || submittingReschedule}
                onClick={handleRescheduleSubmit}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {submittingReschedule ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : null}
                Confirm New Time
              </Button>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Modal / Section */}
        {isCancelling && !isCancelled && (
          <div className="bg-white rounded-3xl border border-rose-300 shadow-md p-6 sm:p-8 space-y-4 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-rose-700">
              <AlertCircle className="h-5 w-5" />
              <h3 className="text-base font-bold">Cancel Appointment</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to cancel this appointment? This action cannot be undone. Once
              cancelled, this time slot will automatically be offered to clients waiting on our
              priority waitlist.
            </p>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {cancelError}
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Reason for cancellation (optional)
              </label>
              <Textarea
                placeholder="Let us know why you need to cancel..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCancelling(false)}
                className="text-xs"
              >
                Keep Appointment
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={submittingCancel}
                onClick={handleCancelSubmit}
                className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
              >
                {submittingCancel ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                Confirm Cancellation
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-500">
        Powered by Rooman Bookings | Rooman Technologies
      </footer>
    </div>
  );
}
