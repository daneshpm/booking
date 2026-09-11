'use client';

import * as React from 'react';
import {
  Zap,
  X,
  UserCheck,
  PhoneCall,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle2,
  Printer,
  Sparkles,
  Search,
  AlertCircle,
  Loader2,
  DollarSign,
} from 'lucide-react';
import {
  createFastPassBookingAction,
  getFastPassInitDataAction,
  searchCustomerByPhoneOrEmailAction,
  type FastPassActionResult,
} from '../appointments/actions';

export interface FastPassModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (bookingId: string) => void;
  services?: { id: string; name: string; durationMinutes: number; price?: any }[];
  staffMembers?: { id: string; name: string }[];
}

export function FastPassModal({
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
  services: initialServices,
  staffMembers: initialStaff,
}: FastPassModalProps) {
  const [source, setSource] = React.useState<'WALK_IN' | 'PHONE_CALL'>('WALK_IN');
  const [immediate, setImmediate] = React.useState(true);

  // Form fields
  const [phone, setPhone] = React.useState('');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [selectedServiceId, setSelectedServiceId] = React.useState('');
  const [selectedStaffId, setSelectedStaffId] = React.useState('ANY');
  const [date, setDate] = React.useState('');
  const [time, setTime] = React.useState('');
  const [notes, setNotes] = React.useState('');

  // UI States
  const [services, setServices] = React.useState(initialServices || []);
  const [staff, setStaff] = React.useState(initialStaff || []);
  const [isLoadingInit, setIsLoadingInit] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isSearchingCustomer, setIsSearchingCustomer] = React.useState(false);
  const [foundCustomer, setFoundCustomer] = React.useState<{
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null>(null);

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = React.useState<
    FastPassActionResult['bookingDetails'] | null
  >(null);

  const phoneInputRef = React.useRef<HTMLInputElement>(null);

  // Initialize data if not passed in
  React.useEffect(() => {
    if (!isOpen) return;

    // Reset error & confirmation on open
    setErrorMessage(null);
    setConfirmedBooking(null);

    // Default custom date to today, time to current rounded to next 15 mins
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    setDate(`${yyyy}-${mm}-${dd}`);

    const roundedMins = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(roundedMins, 0, 0);
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    setTime(`${hh}:${min}`);

    if (!services.length || !staff.length) {
      setIsLoadingInit(true);
      getFastPassInitDataAction(workspaceId)
        .then((res) => {
          if (res.success) {
            setServices(res.services);
            setStaff(res.staff);
            if (res.services.length > 0 && !selectedServiceId) {
              setSelectedServiceId(res.services[0].id);
            }
          }
        })
        .finally(() => {
          setIsLoadingInit(false);
        });
    } else if (services.length > 0 && !selectedServiceId) {
      setSelectedServiceId(services[0].id);
    }

    // Auto-focus phone input
    const timer = setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, [isOpen, workspaceId]);

  // Sync initial props
  React.useEffect(() => {
    if (initialServices?.length) {
      setServices(initialServices);
      if (!selectedServiceId) setSelectedServiceId(initialServices[0].id);
    }
    if (initialStaff?.length) {
      setStaff(initialStaff);
    }
  }, [initialServices, initialStaff]);

  // Debounced auto-search customer by phone
  React.useEffect(() => {
    const trimmed = phone.trim();
    if (trimmed.length < 4) {
      setFoundCustomer(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingCustomer(true);
      try {
        const res = await searchCustomerByPhoneOrEmailAction(workspaceId, trimmed);
        if (res.success && res.customer) {
          setFoundCustomer(res.customer);
          setName(res.customer.name);
          if (!res.customer.email.endsWith('@walkin.local')) {
            setEmail(res.customer.email);
          }
        } else {
          setFoundCustomer(null);
        }
      } catch {
        setFoundCustomer(null);
      } finally {
        setIsSearchingCustomer(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [phone, workspaceId]);

  // Handle submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!phone.trim()) {
      setErrorMessage('Please provide customer phone number.');
      return;
    }
    if (!name.trim()) {
      setErrorMessage('Please enter customer name.');
      return;
    }
    if (!selectedServiceId) {
      setErrorMessage('Please select a service.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createFastPassBookingAction({
        workspaceId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        customerPhone: phone.trim(),
        customerName: name.trim(),
        customerEmail: email.trim() || undefined,
        source,
        immediate,
        date: immediate ? undefined : date,
        time: immediate ? undefined : time,
        notes: notes.trim() || undefined,
      });

      if (!result.success || !result.bookingDetails) {
        setErrorMessage(result.error || 'Failed to complete booking.');
        return;
      }

      setConfirmedBooking(result.bookingDetails);
      onSuccess?.(result.bookingId!);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForAnother = () => {
    setConfirmedBooking(null);
    setPhone('');
    setName('');
    setEmail('');
    setNotes('');
    setFoundCustomer(null);
    setErrorMessage(null);
    setImmediate(true);
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 100);
  };

  if (!isOpen) return null;

  const currentService = services.find((s) => s.id === selectedServiceId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-[#371e68] to-[#5c34ad] text-white">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-sm">
              <Zap className="h-4 w-4 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">Front-Desk Fast Pass</h2>
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono text-[10px] font-semibold border border-amber-400/30">
                  Alt+W
                </span>
              </div>
              <p className="text-[11px] text-purple-200">
                10-second instant booker for walk-ins and phone calls
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-purple-200 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {isLoadingInit ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-[#5c34ad]" />
              <span className="text-xs font-semibold">Preparing Fast Pass desk...</span>
            </div>
          ) : confirmedBooking ? (
            /* Ticket / Receipt Confirmation View */
            <div className="space-y-6 animate-in zoom-in-95 duration-200">
              <div className="text-center space-y-1.5">
                <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Booking Confirmed!</h3>
                <p className="text-xs text-slate-500">
                  The client is scheduled and calendar block is locked in.
                </p>
              </div>

              {/* Fast Pass Ticket Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative overflow-hidden shadow-xs">
                <div className="absolute top-0 right-0 px-3 py-1 bg-[#5c34ad] text-white text-[10px] font-bold rounded-bl-xl uppercase tracking-wider">
                  {confirmedBooking.source === 'WALK_IN' ? 'Walk-In' : 'Phone Call'}
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Client
                    </span>
                    <span className="font-bold text-slate-900 text-sm block">
                      {confirmedBooking.customerName}
                    </span>
                    {confirmedBooking.customerPhone && (
                      <span className="text-slate-500 text-[11px] block">
                        {confirmedBooking.customerPhone}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Assigned Staff
                    </span>
                    <span className="font-bold text-slate-900 text-sm block">
                      {confirmedBooking.staffName}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Service & Duration
                    </span>
                    <span className="font-bold text-slate-900 block">
                      {confirmedBooking.serviceName}
                    </span>
                    <span className="text-slate-500 text-[11px] block">
                      {confirmedBooking.durationMinutes} minutes
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Time Window
                    </span>
                    <span className="font-bold text-[#5c34ad] block">
                      {confirmedBooking.startTime} - {confirmedBooking.endTime}
                    </span>
                    {confirmedBooking.price > 0 && (
                      <span className="text-emerald-700 font-semibold text-[11px] block">
                        ${confirmedBooking.price.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Pass ID: #{confirmedBooking.id.substring(0, 8).toUpperCase()}</span>
                  <span>Zero-Overlap Protected</span>
                </div>
              </div>

              {/* Post-Booking Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForAnother}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                  Book Another Walk-In
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white font-bold text-xs transition-colors shadow-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Booking Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Source Selector: Walk-In vs Phone Call */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSource('WALK_IN')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    source === 'WALK_IN'
                      ? 'bg-purple-50/80 border-[#5c34ad] text-[#5c34ad] shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  <span>Front-Desk Walk-In</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSource('PHONE_CALL')}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    source === 'PHONE_CALL'
                      ? 'bg-indigo-50/80 border-indigo-600 text-indigo-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <PhoneCall className="h-4 w-4" />
                  <span>Phone-In Customer</span>
                </button>
              </div>

              {/* Customer Phone & Instant Lookup */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <span>Phone Number</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  {isSearchingCustomer && (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Loader2 className="h-2.5 w-2.5 animate-spin" /> Looking up...
                    </span>
                  )}
                </div>

                <div className="relative">
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    placeholder="e.g. +1 555-0199 or 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#5c34ad] focus:ring-2 focus:ring-purple-100 font-medium"
                    required
                  />
                  {foundCustomer && (
                    <div className="absolute right-2 top-2 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold rounded-md flex items-center gap-1 animate-in fade-in">
                      <Sparkles className="h-2.5 w-2.5" />
                      <span>Existing Client</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Customer Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Jenkins"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#5c34ad] font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="sarah@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3.5 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#5c34ad] font-medium"
                  />
                </div>
              </div>

              {/* Service & Staff Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Service Requested <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad] font-medium"
                    required
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes}m) {s.price ? `• $${Number(s.price)}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Staff Member
                  </label>
                  <select
                    value={selectedStaffId}
                    onChange={(e) => setSelectedStaffId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad] font-medium"
                  >
                    <option value="ANY">Any Available Staff (Fastest)</option>
                    {staff.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Timing Mode: Start Right Now vs Scheduled */}
              <div className="pt-1">
                <label className="block text-xs font-bold text-slate-700 mb-1.5">When?</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setImmediate(true)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      immediate
                        ? 'bg-amber-50 border-amber-400 text-amber-800 ring-1 ring-amber-400/40'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                    <span>Start Right Now</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImmediate(false)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      !immediate
                        ? 'bg-purple-50 border-[#5c34ad] text-[#5c34ad] ring-1 ring-purple-300/40'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>Choose Time Slot</span>
                  </button>
                </div>

                {!immediate && (
                  <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in duration-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                        required={!immediate}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Time
                      </label>
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                        required={!immediate}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Desk Notes / Special Request{' '}
                  <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. VIP client, preferred chair 2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-[#5c34ad] hover:from-amber-600 hover:to-[#4d2994] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Locking In Slot...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 fill-current text-amber-200" />
                      <span>
                        Confirm {source === 'WALK_IN' ? 'Walk-In' : 'Phone'} Booking
                        {currentService ? ` (${currentService.durationMinutes}m)` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
