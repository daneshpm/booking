'use client';

import * as React from 'react';
import {
  Sparkles,
  X,
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { addToWaitlistDashboardAction } from '../appointments/actions';

export interface AddToWaitlistModalProps {
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  services: { id: string; name: string; durationMinutes: number; price?: any }[];
  staffMembers: { id: string; name: string }[];
}

export function AddToWaitlistModal({
  workspaceId,
  isOpen,
  onClose,
  onSuccess,
  services,
  staffMembers,
}: AddToWaitlistModalProps) {
  const [serviceId, setServiceId] = React.useState(services[0]?.id || '');
  const [staffId, setStaffId] = React.useState('ANY');
  const [preferredDate, setPreferredDate] = React.useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [customerName, setCustomerName] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [notes, setNotes] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      if (services.length > 0 && !serviceId) {
        setServiceId(services[0].id);
      }
    }
  }, [isOpen, services, serviceId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!customerName.trim() || !customerEmail.trim()) {
      setError('Please provide customer name and email.');
      return;
    }
    if (!serviceId) {
      setError('Please choose a service.');
      return;
    }
    if (!preferredDate) {
      setError('Please choose a preferred date.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await addToWaitlistDashboardAction({
        workspaceId,
        serviceId,
        staffId: staffId === 'ANY' ? undefined : staffId,
        preferredDate,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        setError((res as any).error || 'Failed to add client to waitlist.');
      } else {
        setSuccessMsg('Client successfully added to priority waitlist!');
        setTimeout(() => {
          onSuccess?.();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-purple-100 text-[#5c34ad] flex items-center justify-center font-bold">
              <Sparkles className="h-4 w-4 fill-current" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Add to Priority Waitlist</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Service & Staff Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Requested Service <span className="text-rose-500">*</span>
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
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
                Staff Preference
              </label>
              <select
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
              >
                <option value="ANY">Any Available Staff</option>
                {staffMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preferred Date */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Preferred Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
              required
            />
          </div>

          {/* Customer Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. David Ross"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#5c34ad]"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                placeholder="david@example.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#5c34ad]"
                required
              />
            </div>
          </div>

          {/* Phone & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="tel"
                placeholder="+1 555-0199"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#5c34ad]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preferred Time / Notes{' '}
                <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mornings only"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-900 focus:outline-none focus:border-[#5c34ad]"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-[#5c34ad] hover:bg-[#4d2994] rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <span>Add to Waitlist</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
