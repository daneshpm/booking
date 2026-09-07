'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Clock,
  DollarSign,
  MapPin,
  CheckCircle2,
  Video,
  Shield,
  ArrowRight,
  ArrowLeft,
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  FileText,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { Button, Input, Textarea } from '@bookings/ui';
import {
  createPublicBookingAction,
  getAvailableSlotsAction,
  type BookingResult,
  type AvailableSlot,
} from './actions';
import type { ServiceOutputDTO } from '@bookings/feature-services';

interface BookingFlowClientProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  service: ServiceOutputDTO;
}

export function BookingFlowClient({ workspace, service }: BookingFlowClientProps) {
  // Generate next 14 days starting from tomorrow/today
  const availableDates = React.useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      // Skip Sundays (0) if desired, or include all
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        const labelDay = d.toLocaleDateString('en-US', { weekday: 'short' });
        const labelDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dates.push({ dateStr, labelDay, labelDate, isToday: i === 0 });
      }
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = React.useState<string>(availableDates[0]?.dateStr || '');
  const [selectedTime, setSelectedTime] = React.useState<string | null>(null);
  const [selectedSlotLabel, setSelectedSlotLabel] = React.useState<string | null>(null);
  const [selectedStaffId, setSelectedStaffId] = React.useState<string | undefined>(undefined);
  const [step, setStep] = React.useState<'SLOT' | 'DETAILS' | 'CONFIRMED'>('SLOT');

  // Dynamic available slots state
  const [availableSlots, setAvailableSlots] = React.useState<AvailableSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = React.useState(true);

  // Customer Form state
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerNotes, setCustomerNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [bookingResult, setBookingResult] = React.useState<BookingResult | null>(null);

  // Fetch real available slots when date changes
  React.useEffect(() => {
    let isMounted = true;
    async function loadSlots() {
      if (!selectedDate) return;
      setIsLoadingSlots(true);
      setErrorMsg(null);
      try {
        const result = await getAvailableSlotsAction(workspace.id, service.id, selectedDate);
        if (isMounted) {
          if (result.success) {
            setAvailableSlots(result.slots);
          } else {
            setAvailableSlots([]);
            if (result.error) {
              console.warn('Slot generation notice:', result.error);
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error('Failed to load slots:', err);
          setAvailableSlots([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingSlots(false);
        }
      }
    }

    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, workspace.id, service.id]);

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedTime(slot.time);
    setSelectedSlotLabel(slot.label);
    setSelectedStaffId(slot.staffId);
    setErrorMsg(null);
    setStep('DETAILS');
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !customerEmail || !selectedDate || !selectedTime) {
      setErrorMsg('Please provide your name and email to confirm the booking.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await createPublicBookingAction({
      workspaceId: workspace.id,
      serviceId: service.id,
      staffId: selectedStaffId,
      date: selectedDate,
      time: selectedTime,
      customerName,
      customerEmail,
      customerPhone,
      customerNotes,
      customerTimezone: workspace.timezone,
    });

    setIsSubmitting(false);

    if (result.success) {
      setBookingResult(result);
      setStep('CONFIRMED');
    } else {
      setErrorMsg(result.error || 'Failed to complete booking. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-5xl rounded-3xl bg-slate-900/90 backdrop-blur-2xl border border-slate-800 shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12">
        {/* Left Column: Service Details */}
        <div className="md:col-span-5 p-8 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col justify-between space-y-6 bg-slate-950/40">
          <div>
            <div className="flex items-center gap-2.5 mb-6">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
                {workspace.name.charAt(0)}
              </div>
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  {workspace.name}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Public Booking Portal
                </span>
              </div>
            </div>

            <h1 className="text-2xl font-black text-white tracking-tight leading-snug">
              {service.name}
            </h1>

            <div className="mt-5 space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2.5">
                <Clock className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="font-semibold">{service.formattedDuration}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{service.formattedPrice}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {service.locationType === 'ONLINE_MEETING' ? (
                  <Video className="h-4 w-4 text-purple-400 shrink-0" />
                ) : (
                  <MapPin className="h-4 w-4 text-purple-400 shrink-0" />
                )}
                <span>
                  {service.locationType === 'ONLINE_MEETING'
                    ? 'Online Video Meeting (Google Meet)'
                    : service.locationDetails || 'In-Person'}
                </span>
              </div>
            </div>

            {service.description && (
              <p className="mt-6 text-xs leading-relaxed text-slate-400 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                {service.description}
              </p>
            )}

            {(service.bufferBeforeMinutes > 0 || service.bufferAfterMinutes > 0) && (
              <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400">
                <Shield className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                <span>
                  Includes {service.bufferBeforeMinutes}m prep and {service.bufferAfterMinutes}m wrap-up buffer.
                </span>
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <Link
              href={`/book/${workspace.slug}`}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← All Services
            </Link>
            <Link
              href="/services"
              className="text-blue-400 hover:underline font-semibold"
            >
              Admin Dashboard →
            </Link>
          </div>
        </div>

        {/* Right Column: Dynamic Step Container */}
        <div className="md:col-span-7 p-8 bg-slate-900/30 flex flex-col justify-between">
          {/* STEP 1: Select Date & Time */}
          {step === 'SLOT' && (
            <div className="space-y-6">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                  <Clock className="h-3 w-3 text-blue-400" />
                  Step 1 of 2
                </div>
                <h2 className="text-xl font-bold text-white mt-2">Select Date & Time</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Times are automatically displayed in <strong className="text-slate-200">{workspace.timezone}</strong>.
                </p>
              </div>

              {/* Horizontal Date Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-2">
                  Available Dates
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                  {availableDates.map((item) => {
                    const isSelected = selectedDate === item.dateStr;
                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(item.dateStr)}
                        className={`flex flex-col items-center justify-center min-w-[70px] py-2.5 px-2 rounded-xl border text-center transition-all ${
                          isSelected
                            ? 'bg-blue-600 border-blue-500 text-white font-bold shadow-lg shadow-blue-500/25 scale-105'
                            : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                          {item.labelDay}
                        </span>
                        <span className="text-xs font-bold mt-0.5">
                          {item.labelDate}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Available Times for {selectedDate}
                  </label>
                  {isLoadingSlots && (
                    <div className="flex items-center gap-1.5 text-[11px] text-blue-400">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Checking shifts...</span>
                    </div>
                  )}
                </div>

                {isLoadingSlots ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div
                        key={idx}
                        className="h-11 rounded-xl bg-slate-800/40 border border-slate-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-6 rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 text-center">
                    <Clock className="h-6 w-6 text-slate-500 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-300">
                      No Available Slots
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                      Staff are either fully booked or scheduled off on this date. Please choose another date above.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        type="button"
                        onClick={() => handleSlotSelect(slot)}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:bg-blue-600 hover:border-blue-500 text-slate-200 hover:text-white transition-all group font-semibold text-xs shadow-sm hover:shadow-blue-500/20 active:scale-[0.98]"
                      >
                        <span>{slot.label}</span>
                        <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-900/40 text-[11px] text-blue-300 flex items-center gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                <span>
                  Availability verified with real-time buffer management and staff shifts.
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: Customer Information Form */}
          {step === 'DETAILS' && (
            <form onSubmit={handleBookingSubmit} className="space-y-5">
              <div>
                <button
                  type="button"
                  onClick={() => setStep('SLOT')}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Change Date & Time
                </button>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-950/60 border border-blue-800 text-blue-300 text-[10px] font-bold uppercase tracking-wider block w-fit">
                  Step 2 of 2
                </div>
                <h2 className="text-xl font-bold text-white mt-2">Enter Your Contact Details</h2>
                <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-400" />
                    <span>
                      {selectedDate} at {selectedSlotLabel || selectedTime}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 uppercase">
                    {workspace.timezone}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Your Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      required
                      placeholder="e.g. Alex Morgan"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      required
                      type="email"
                      placeholder="alex@example.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Meeting Agenda or Notes (Optional)
                  </label>
                  <Textarea
                    placeholder="Tell us what you'd like to discuss in this session..."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    rows={2}
                    className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 focus:border-blue-500 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={isSubmitting}
                  className="w-full py-3 text-sm font-bold shadow-xl shadow-blue-500/25 gap-2"
                >
                  Confirm & Schedule Appointment
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* STEP 3: Booking Confirmed Success State */}
          {step === 'CONFIRMED' && bookingResult && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-center text-emerald-400 mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="h-9 w-9" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">
                  Appointment Confirmed!
                </h2>
                <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto">
                  A calendar invitation and confirmation email have been dispatched to{' '}
                  <strong className="text-slate-200">{customerEmail}</strong>.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 text-left space-y-3.5 text-xs">
                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-500">Service:</span>
                  <span className="font-bold text-white">{bookingResult.serviceName}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-500">Time & Date:</span>
                  <span className="font-bold text-white">{bookingResult.startTime}</span>
                </div>

                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                  <span className="text-slate-500">Assigned Advisor:</span>
                  <span className="font-bold text-white">{bookingResult.staffName}</span>
                </div>

                {bookingResult.meetingLink && (
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-slate-500">Location:</span>
                    <a
                      href={bookingResult.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-blue-400 hover:text-blue-300 font-bold hover:underline"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Google Meet
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('SLOT');
                    setSelectedTime(null);
                    setBookingResult(null);
                  }}
                  className="flex-1 bg-slate-900 border-slate-800 text-slate-200"
                >
                  Book Another Time
                </Button>
                <Link href={`/book/${workspace.slug}`} className="flex-1">
                  <Button variant="primary" className="w-full">
                    Return to Services
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
