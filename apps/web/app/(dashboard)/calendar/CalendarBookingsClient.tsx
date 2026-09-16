'use client';

import * as React from 'react';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Video,
  ExternalLink,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Loader2,
  Filter,
} from 'lucide-react';
import { Card, CardContent, Badge, Button } from '@bookings/ui';
import { format } from 'date-fns';
import { updateBookingStatusAction, rescheduleBookingAction } from './actions';

export interface CalendarBookingItem {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED';
  meetingLink?: string | null;
  customer: {
    name: string;
    email: string;
    phone?: string | null;
  };
  service: {
    name: string;
    durationMinutes: number;
  };
  staff: {
    name: string;
  };
}

interface CalendarBookingsClientProps {
  initialBookings: CalendarBookingItem[];
}

export function CalendarBookingsClient({ initialBookings }: CalendarBookingsClientProps) {
  const [filter, setFilter] = React.useState<'ALL' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'>(
    'ALL'
  );
  const [loadingId, setLoadingId] = React.useState<string | null>(null);
  const [reschedulingBooking, setReschedulingBooking] = React.useState<CalendarBookingItem | null>(
    null
  );
  const [rescheduleDate, setRescheduleDate] = React.useState('');
  const [rescheduleTime, setRescheduleTime] = React.useState('10:00');
  const [rescheduleError, setRescheduleError] = React.useState<string | null>(null);

  const filteredBookings = React.useMemo(() => {
    if (filter === 'ALL') return initialBookings;
    return initialBookings.filter((b) => b.status === filter);
  }, [initialBookings, filter]);

  const handleStatusChange = async (
    bookingId: string,
    status: 'COMPLETED' | 'CANCELLED' | 'CONFIRMED'
  ) => {
    setLoadingId(bookingId);
    try {
      await updateBookingStatusAction(bookingId, status);
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingBooking || !rescheduleDate || !rescheduleTime) return;

    const chosenDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    if (chosenDateTime.getTime() < Date.now() - 60000) {
      setRescheduleError('Please select a future date and time for rescheduling.');
      return;
    }

    setLoadingId(reschedulingBooking.id);
    setRescheduleError(null);
    try {
      const res = await rescheduleBookingAction(
        reschedulingBooking.id,
        rescheduleDate,
        rescheduleTime
      );
      if (res.success) {
        setReschedulingBooking(null);
      } else {
        setRescheduleError(res.error || 'Failed to reschedule.');
      }
    } catch (err) {
      setRescheduleError('An error occurred while rescheduling.');
    } finally {
      setLoadingId(null);
    }
  };

  const getStatusBadge = (status: CalendarBookingItem['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <Badge variant="success" className="text-[10px] uppercase">
            CONFIRMED
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge variant="success" className="text-[10px] uppercase bg-emerald-600 text-white">
            COMPLETED
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="danger" className="text-[10px] uppercase">
            CANCELLED
          </Badge>
        );
      case 'RESCHEDULED':
        return (
          <Badge variant="warning" className="text-[10px] uppercase">
            RESCHEDULED
          </Badge>
        );
      default:
        return (
          <Badge variant="default" className="text-[10px] uppercase">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Bookings & Calendar
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Review and manage appointments, join video meetings, complete, or reschedule bookings.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="inline-flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs self-start sm:self-auto">
          {(['ALL', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {filteredBookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CalendarIcon className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Bookings Found
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            {filter === 'ALL'
              ? 'When clients schedule appointments through your booking portal, they will appear here in real-time.'
              : `There are currently no bookings with status "${filter}".`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const isLoadingThis = loadingId === b.id;
            return (
              <Card
                key={b.id}
                className="border-slate-200 dark:border-slate-800 transition-all hover:border-blue-400"
              >
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                      <CalendarIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {b.service.name}
                        </span>
                        {getStatusBadge(b.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>{format(new Date(b.startTime), 'EEE, MMM d, yyyy • h:mm a')}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-indigo-500" />
                          <span>
                            {b.customer.name} ({b.customer.email})
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                    <div className="text-right hidden md:block mr-2">
                      <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
                        Advisor
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {b.staff.name}
                      </span>
                    </div>

                    {b.meetingLink && b.meetingLink.startsWith('http') && (
                      <a
                        href={b.meetingLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                      >
                        <Video className="h-3.5 w-3.5" />
                        Join
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}

                    {/* Action Controls */}
                    {(b.status === 'CONFIRMED' || b.status === 'RESCHEDULED') && (
                      <>
                        <button
                          type="button"
                          disabled={isLoadingThis}
                          onClick={() => handleStatusChange(b.id, 'COMPLETED')}
                          title="Mark Completed"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {isLoadingThis ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Complete</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoadingThis}
                          onClick={() => {
                            setReschedulingBooking(b);
                            setRescheduleDate(format(new Date(b.startTime), 'yyyy-MM-dd'));
                            setRescheduleTime(format(new Date(b.startTime), 'HH:mm'));
                          }}
                          title="Reschedule"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Reschedule</span>
                        </button>

                        <button
                          type="button"
                          disabled={isLoadingThis}
                          onClick={() => handleStatusChange(b.id, 'CANCELLED')}
                          title="Cancel Appointment"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-800 dark:text-slate-100">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Reschedule Appointment</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              {reschedulingBooking.service.name} with {reschedulingBooking.customer.name}
            </p>

            {rescheduleError && (
              <div className="p-3 mb-4 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  min={format(new Date(), 'yyyy-MM-dd')}
                  value={rescheduleDate}
                  onChange={(e) => {
                    setRescheduleDate(e.target.value);
                    setRescheduleError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  New Time (24h)
                </label>
                <input
                  type="time"
                  required
                  value={rescheduleTime}
                  onChange={(e) => {
                    setRescheduleTime(e.target.value);
                    setRescheduleError(null);
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReschedulingBooking(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={loadingId === reschedulingBooking.id}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-sm"
                >
                  {loadingId === reschedulingBooking.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Confirm Reschedule'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
