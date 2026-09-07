'use client';

import * as React from 'react';
import {
  Users,
  Search,
  Mail,
  Phone,
  Calendar,
  Clock,
  Video,
  ExternalLink,
  X,
  FileText,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@bookings/ui';

export interface CustomerBooking {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  meetingLink?: string | null;
  service?: {
    name: string;
    durationMinutes: number;
  };
}

export interface CustomerItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  notes?: string | null;
  createdAt: string | Date;
  bookings: CustomerBooking[];
}

interface CustomersClientProps {
  customers: CustomerItem[];
}

export function CustomersClient({ customers }: CustomersClientProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCustomer, setSelectedCustomer] = React.useState<CustomerItem | null>(null);

  const filteredCustomers = React.useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-800">
              Customers & Client CRM
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-[#5c34ad]">
              {customers.length} Clients
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete directory of customers who booked appointments through your scheduling portal.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers..."
            className="w-full sm:w-64 pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-[#5c34ad]"
          />
        </div>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 px-6 animate-in fade-in duration-200">
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-[#f8f5ff] border border-purple-100 flex items-center justify-center shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-[#5c34ad] text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <Users className="h-5 w-5 stroke-[2.2]" />
              </div>
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 rounded-full bg-white border border-slate-200 shadow-xs flex items-center justify-center">
              <UserCheck className="h-3.5 w-3.5 text-[#5c34ad]" />
            </div>
          </div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">No Customers Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1.5 leading-relaxed">
            {searchQuery ? 'No customer matches your search criteria.' : 'As clients book appointments through your public booking portal, their profiles and history will automatically appear here.'}
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs bg-white">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Total Bookings</th>
                <th className="py-3 px-4">Latest Appointment</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((c) => {
                const latestBooking = c.bookings[0];
                const initials = c.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase();

                return (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-[#ff6b6b]/15 text-[#ff6b6b] font-black text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{c.name}</div>
                          <span className="text-[10px] text-slate-400">
                            Added {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="text-slate-700 flex items-center gap-1.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{c.email}</span>
                      </div>
                      {c.phone && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{c.phone}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-[#5c34ad] border border-purple-100">
                        {c.bookings.length} {c.bookings.length === 1 ? 'Booking' : 'Bookings'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {latestBooking ? (
                        <div>
                          <div className="font-semibold text-slate-800">
                            {new Date(latestBooking.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {latestBooking.service?.name || 'Appointment'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">None</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCustomer(c);
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-[#5c34ad] hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#5c34ad] text-white font-bold flex items-center justify-center text-sm">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.name}</h3>
                  <span className="text-[11px] text-slate-400">{selectedCustomer.email}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Contact Info Card */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Email
                  </span>
                  <span className="font-semibold text-slate-800">{selectedCustomer.email}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Phone
                  </span>
                  <span className="font-semibold text-slate-800">
                    {selectedCustomer.phone || 'Not provided'}
                  </span>
                </div>
              </div>

              {/* Notes */}
              {selectedCustomer.notes && (
                <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs text-amber-950">
                  <span className="font-bold block mb-1">Customer Notes:</span>
                  <p className="text-slate-600">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Appointment History */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2.5">
                  Appointment History ({selectedCustomer.bookings.length})
                </span>

                {selectedCustomer.bookings.length === 0 ? (
                  <p className="text-xs text-slate-400">No appointments recorded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedCustomer.bookings.map((b) => {
                      const start = new Date(b.startTime);
                      return (
                        <div
                          key={b.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-800">
                              {start.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}{' '}
                              •{' '}
                              {start.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {b.service?.name || 'Consultation'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                b.status === 'CONFIRMED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : b.status === 'COMPLETED'
                                  ? 'bg-blue-50 text-blue-700'
                                  : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              {b.status}
                            </span>
                            {b.meetingLink && (
                              <a
                                href={b.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-[#5c34ad] hover:bg-purple-50 rounded"
                                title="Open Google Meet"
                              >
                                <Video className="h-3.5 w-3.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
