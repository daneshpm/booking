'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  HelpCircle,
  Plus,
  Calendar as CalendarIcon,
  Clock,
  User,
  Video,
  CheckCircle,
  XCircle,
  ExternalLink,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  Loader2,
  X,
  Mail,
  Phone,
} from 'lucide-react';
import { createDashboardAppointmentAction, updateAppointmentStatusAction } from './actions';

export interface AppointmentItem {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW' | 'RESCHEDULED';
  meetingLink?: string | null;
  customer: {
    id?: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  service: {
    id?: string;
    name: string;
    durationMinutes: number;
    price?: any;
  };
  staff: {
    id?: string;
    name: string;
  };
}

export interface AvailableService {
  id: string;
  name: string;
  durationMinutes: number;
}

export interface AvailableStaff {
  id: string;
  name: string;
}

interface AppointmentsClientProps {
  workspaceId: string;
  workspaceTimezone: string;
  initialAppointments: AppointmentItem[];
  services: AvailableService[];
  staffMembers: AvailableStaff[];
}

export function AppointmentsClient({
  workspaceId,
  workspaceTimezone,
  initialAppointments,
  services,
  staffMembers,
}: AppointmentsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = React.useState<'upcoming' | 'past' | 'custom'>('upcoming');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isCalendarView, setIsCalendarView] = React.useState(searchParams.get('clview') === 'true');
  const [weekOffset, setWeekOffset] = React.useState(0);

  // Synchronize clview param
  React.useEffect(() => {
    if (searchParams.get('clview') === 'true') {
      setIsCalendarView(true);
    } else if (searchParams.get('clview') === 'false') {
      setIsCalendarView(false);
    }
  }, [searchParams]);

  // Week days calculation for calendar grid view
  const weekDays = React.useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const timeSlots = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  // Modal form states
  const [selectedServiceId, setSelectedServiceId] = React.useState(services[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = React.useState(staffMembers[0]?.id || '');
  const [date, setDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [time, setTime] = React.useState('10:00');
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [formError, setFormError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);

  // Open modal if URL has ?new=true
  React.useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setIsModalOpen(true);
    }
  }, [searchParams]);

  // Filter appointments
  const now = new Date();
  const filteredAppointments = React.useMemo(() => {
    return initialAppointments.filter((app) => {
      const appDate = new Date(app.startTime);
      const isUpcoming = appDate >= now && app.status !== 'CANCELLED';
      const isPast = appDate < now || app.status === 'COMPLETED' || app.status === 'CANCELLED';

      if (activeTab === 'upcoming' && !isUpcoming) return false;
      if (activeTab === 'past' && !isPast) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesName = app.customer.name.toLowerCase().includes(query);
        const matchesEmail = app.customer.email.toLowerCase().includes(query);
        const matchesService = app.service.name.toLowerCase().includes(query);
        const matchesStaff = app.staff.name.toLowerCase().includes(query);
        return matchesName || matchesEmail || matchesService || matchesStaff;
      }

      return true;
    });
  }, [initialAppointments, activeTab, searchQuery, now]);

  // Handle appointment creation
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!customerName.trim() || !customerEmail.trim()) {
      setFormError('Please provide customer name and email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createDashboardAppointmentAction({
        workspaceId,
        serviceId: selectedServiceId,
        staffId: selectedStaffId,
        date,
        time,
        customerName,
        customerEmail,
        customerPhone,
        notes,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to create appointment.');
        setIsSubmitting(false);
        return;
      }

      setIsModalOpen(false);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setNotes('');
      router.refresh();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status changes
  const handleStatusChange = async (id: string, newStatus: 'COMPLETED' | 'CANCELLED') => {
    setActionLoadingId(id);
    try {
      await updateAppointmentStatusAction(id, newStatus);
      router.refresh();
    } catch (err) {
      console.error('Failed to change status:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-white">
      {/* ---------------------------------------------------- */}
      {/* 1. TOP HEADER & FILTER BAR                           */}
      {/* ---------------------------------------------------- */}
      <div className="px-6 pt-5 pb-0 border-b border-slate-200">
        {/* Title row */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Appointments</h1>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 transition-colors"
            title="Appointments Help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs & Search row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-6 text-sm font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('upcoming')}
              className={`pb-3 border-b-2 transition-all ${
                activeTab === 'upcoming'
                  ? 'border-[#5c34ad] text-[#5c34ad] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Upcoming
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('past')}
              className={`pb-3 border-b-2 transition-all ${
                activeTab === 'past'
                  ? 'border-[#5c34ad] text-[#5c34ad] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Past
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`pb-3 border-b-2 transition-all ${
                activeTab === 'custom'
                  ? 'border-[#5c34ad] text-[#5c34ad] font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Custom Date
            </button>
          </div>

          {/* Controls: Search and View Mode Switcher */}
          <div className="flex items-center gap-2 pb-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search"
                className="w-full sm:w-56 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#5c34ad] focus:ring-1 focus:ring-[#5c34ad]"
              />
            </div>

            {/* List vs Calendar View Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setIsCalendarView(false);
                  router.replace('/appointments?clview=false');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  !isCalendarView
                    ? 'bg-white text-[#5c34ad] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="List View (clview=false)"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsCalendarView(true);
                  router.replace('/appointments?clview=true');
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isCalendarView
                    ? 'bg-white text-[#5c34ad] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Calendar Grid View (clview=true)"
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 2. APPOINTMENTS CONTENT AREA                         */}
      {/* ---------------------------------------------------- */}
      {isCalendarView ? (
        /* CALENDAR WEEK GRID VIEW (clview=true) */
        <div className="flex-1 p-6 flex flex-col space-y-4 max-w-7xl w-full self-start">
          {/* Calendar Header with Week Controls */}
          <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev - 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                title="Previous Week"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset(0)}
                className="px-3 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setWeekOffset((prev) => prev + 1)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
                title="Next Week"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

              <span className="text-xs font-bold text-slate-800 ml-2">
                {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} –{' '}
                {weekDays[6].toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>New Appointment</span>
            </button>
          </div>

          {/* Grid Container */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
            {/* Week Header Row */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold divide-x divide-slate-200">
              <div className="py-2.5 px-2 text-slate-400 text-[11px]">Time</div>
              {weekDays.map((day) => {
                const isToday = day.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={day.toISOString()}
                    className={`py-2 px-1 ${isToday ? 'bg-purple-50/60 text-[#5c34ad]' : 'text-slate-700'}`}
                  >
                    <div className="text-[11px] font-semibold uppercase">
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div
                      className={`text-sm font-bold inline-block px-2 py-0.5 rounded-full ${isToday ? 'bg-[#5c34ad] text-white' : ''}`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Hourly Rows */}
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {timeSlots.map((slot) => {
                const [slotHour] = slot.split(':').map(Number);
                return (
                  <div
                    key={slot}
                    className="grid grid-cols-8 divide-x divide-slate-100 min-h-[56px]"
                  >
                    <div className="p-2 text-[10px] font-bold text-slate-400 text-right pr-3 select-none">
                      {slot}
                    </div>

                    {weekDays.map((day) => {
                      const dayStr = day.toISOString().split('T')[0];
                      const slotBookings = initialAppointments.filter((app) => {
                        const appDate = new Date(app.startTime);
                        const appDayStr = appDate.toISOString().split('T')[0];
                        return appDayStr === dayStr && appDate.getHours() === slotHour;
                      });

                      return (
                        <div
                          key={dayStr + slot}
                          className="p-1 relative group hover:bg-purple-50/20 transition-colors min-h-[56px]"
                        >
                          {slotBookings.length > 0 ? (
                            slotBookings.map((b) => (
                              <div
                                key={b.id}
                                className="bg-[#f8f5ff] border border-purple-200 rounded-lg p-1.5 shadow-2xs space-y-0.5 text-left"
                              >
                                <div className="text-[10px] font-bold text-[#5c34ad] truncate">
                                  {b.customer.name}
                                </div>
                                <div className="text-[9px] text-slate-500 truncate">
                                  {b.service.name}
                                </div>
                                <div className="flex items-center gap-1 text-[9px] text-slate-400">
                                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>{slot}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDate(dayStr);
                                setTime(slot);
                                setIsModalOpen(true);
                              }}
                              className="w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-bold text-[#5c34ad] bg-purple-50/80 rounded-md border border-dashed border-purple-300 transition-all cursor-pointer"
                            >
                              + Book
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW (clview=false) */
        <div className="flex-1 p-6 flex flex-col items-center justify-center min-h-[450px]">
          {filteredAppointments.length === 0 ? (
            /* Professional Layered Stitch Empty State */
            <div className="flex flex-col items-center justify-center text-center max-w-md py-12 px-6 animate-in fade-in duration-200">
              {/* Layered Icon Stack */}
              <div className="relative mb-5">
                <div className="w-16 h-16 rounded-2xl bg-[#f8f5ff] border border-purple-100 flex items-center justify-center shadow-xs">
                  <div className="w-10 h-10 rounded-xl bg-[#5c34ad] text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                    <CalendarIcon className="h-5 w-5 stroke-[2.2]" />
                  </div>
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center">
                  <Clock className="h-3.5 w-3.5 text-[#5c34ad]" />
                </div>
              </div>

              {/* Professional Heading & Subtext */}
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {activeTab === 'upcoming'
                  ? 'No Upcoming Appointments'
                  : activeTab === 'past'
                    ? 'No Past Appointments'
                    : 'No Appointments Found'}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
                {activeTab === 'upcoming'
                  ? 'Your scheduled client bookings and video consultations will appear here in chronological order.'
                  : 'All completed or past client meetings will be archived in this section.'}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>New Appointment</span>
                </button>
              </div>
            </div>
          ) : (
            /* APPOINTMENTS LIST TABLE (WHEN APPOINTMENTS EXIST) */
            <div className="w-full max-w-5xl self-start space-y-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {filteredAppointments.length} appointment
                  {filteredAppointments.length > 1 ? 's' : ''} found
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
                  <span>New Appointment</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Date & Time</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Meeting</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAppointments.map((app) => {
                      const start = new Date(app.startTime);
                      const end = new Date(app.endTime);

                      const dateStr = start.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                      const timeStr = `${start.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} - ${end.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}`;

                      return (
                        <tr key={app.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{dateStr}</div>
                            <div className="text-[11px] text-slate-500">{timeStr}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{app.customer.name}</div>
                            <div className="text-[11px] text-slate-500">{app.customer.email}</div>
                            {app.customer.phone && (
                              <div className="text-[10px] text-slate-400">{app.customer.phone}</div>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800">{app.service.name}</span>
                            <span className="text-[10px] text-slate-400 block">
                              {app.service.durationMinutes} mins
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <div className="h-5 w-5 rounded-full bg-purple-100 text-[#5c34ad] font-bold text-[10px] flex items-center justify-center">
                                {app.staff.name.charAt(0)}
                              </div>
                              <span className="text-slate-700 font-medium">{app.staff.name}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                app.status === 'CONFIRMED'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : app.status === 'COMPLETED'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : app.status === 'RESCHEDULED'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {app.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {app.meetingLink && app.meetingLink.startsWith('http') ? (
                              <a
                                href={app.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[#5c34ad] hover:underline font-semibold text-xs"
                              >
                                <Video className="h-3.5 w-3.5" />
                                <span>Join Meet</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px]">In Person</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {app.status !== 'COMPLETED' && (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === app.id}
                                  onClick={() => handleStatusChange(app.id, 'COMPLETED')}
                                  title="Mark Completed"
                                  className="p-1 rounded text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              {app.status !== 'CANCELLED' && (
                                <button
                                  type="button"
                                  disabled={actionLoadingId === app.id}
                                  onClick={() => handleStatusChange(app.id, 'CANCELLED')}
                                  title="Cancel Appointment"
                                  className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                  <XCircle className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. INTERACTIVE "NEW APPOINTMENT" MODAL               */}
      {/* ---------------------------------------------------- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#5c34ad]/10 text-[#5c34ad] flex items-center justify-center font-bold">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Schedule New Appointment</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateAppointment} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700">
                  {formError}
                </div>
              )}

              {/* Service & Staff Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Event Type / Service
                  </label>
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                    required
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.durationMinutes}m)
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
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                    required
                  >
                    {staffMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Appointment Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time Slot</label>
                  <select
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                    required
                  >
                    <option value="09:00">09:00 AM</option>
                    <option value="09:30">09:30 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="14:30">02:30 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="15:30">03:30 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="16:30">04:30 PM</option>
                  </select>
                </div>
              </div>

              {/* Customer Information */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Customer Details
                </span>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5c34ad]"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="client@example.com"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5c34ad]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5c34ad]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes / Objectives (Optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Initial consultation requirements..."
                    rows={2}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5c34ad]"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#5c34ad] hover:bg-[#4d2994] rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Scheduling...</span>
                    </>
                  ) : (
                    <span>Confirm Booking</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
