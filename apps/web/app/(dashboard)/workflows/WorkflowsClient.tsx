'use client';

import * as React from 'react';
import {
  Activity,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  Calendar,
  Zap,
  ArrowRight,
  ShieldCheck,
  BellRing,
  Plus,
  X,
  Send,
} from 'lucide-react';

interface WorkflowRule {
  id: string;
  name: string;
  trigger: string;
  channel: 'EMAIL' | 'SMS' | 'WEBHOOK';
  recipient: 'Client' | 'Staff' | 'Both';
  delay: string;
  enabled: boolean;
  description: string;
}

const INITIAL_WORKFLOWS: WorkflowRule[] = [
  {
    id: 'wf-1',
    name: 'Instant Booking Confirmation',
    trigger: 'Booking Created',
    channel: 'EMAIL',
    recipient: 'Both',
    delay: 'Immediately',
    enabled: true,
    description: 'Sends calendar invite with Google Meet link and appointment summary upon confirmation.',
  },
  {
    id: 'wf-2',
    name: '24-Hour Pre-Appointment Reminder',
    trigger: '24 Hours Before Appointment',
    channel: 'EMAIL',
    recipient: 'Client',
    delay: '-24 Hours',
    enabled: true,
    description: 'Reminds client of upcoming session, includes reschedule and cancel direct links.',
  },
  {
    id: 'wf-3',
    name: '1-Hour Video Room Ready Alert',
    trigger: '60 Minutes Before Appointment',
    channel: 'EMAIL',
    recipient: 'Both',
    delay: '-60 Minutes',
    enabled: true,
    description: 'Pings both attendee and staff advisor with meeting room link and preparation checklist.',
  },
  {
    id: 'wf-4',
    name: 'Post-Appointment Feedback & Review',
    trigger: 'Status Changed to Completed',
    channel: 'EMAIL',
    recipient: 'Client',
    delay: '+2 Hours',
    enabled: false,
    description: 'Follow-up email requesting a review rating and notes from the completed session.',
  },
  {
    id: 'wf-5',
    name: 'Reschedule / Cancellation Notice',
    trigger: 'Booking Modified or Cancelled',
    channel: 'EMAIL',
    recipient: 'Both',
    delay: 'Immediately',
    enabled: true,
    description: 'Instantly alerts attendees and frees up staff time slot in the calendar system.',
  },
];

export function WorkflowsClient() {
  const [workflows, setWorkflows] = React.useState<WorkflowRule[]>(INITIAL_WORKFLOWS);
  const [savedMessage, setSavedMessage] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);

  // New workflow form state
  const [newWfName, setNewWfName] = React.useState('');
  const [newWfTrigger, setNewWfTrigger] = React.useState('Booking Created');
  const [newWfChannel, setNewWfChannel] = React.useState<'EMAIL' | 'SMS' | 'WEBHOOK'>('EMAIL');
  const [newWfRecipient, setNewWfRecipient] = React.useState<'Client' | 'Staff' | 'Both'>('Client');
  const [newWfDelay, setNewWfDelay] = React.useState('Immediately');
  const [newWfDescription, setNewWfDescription] = React.useState('');

  const toggleWorkflow = (id: string) => {
    setWorkflows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  const handleCreateWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfName.trim()) return;

    const newRule: WorkflowRule = {
      id: `wf-${Date.now()}`,
      name: newWfName.trim(),
      trigger: newWfTrigger,
      channel: newWfChannel,
      recipient: newWfRecipient,
      delay: newWfDelay,
      enabled: true,
      description: newWfDescription.trim() || `Automated ${newWfChannel.toLowerCase()} notification for ${newWfTrigger}.`,
    };

    setWorkflows((prev) => [newRule, ...prev]);
    setIsCreateModalOpen(false);
    setNewWfName('');
    setNewWfDescription('');
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2000);
  };

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Workflows & Automation</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-[#5c34ad]">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Automated notifications, reminders, and triggers for clients and team members.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {savedMessage && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Workflow saved</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Grid of Workflows */}
      <div className="space-y-3">
        {workflows.map((wf) => (
          <div
            key={wf.id}
            className="p-4 border border-slate-200 rounded-2xl bg-white hover:border-purple-200 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  wf.enabled
                    ? 'bg-purple-50 text-[#5c34ad] border border-purple-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Zap className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-800">{wf.name}</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                    <Mail className="h-3 w-3" />
                    {wf.channel}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600">
                    <Clock className="h-3 w-3" />
                    {wf.delay}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">
                    To: {wf.recipient}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                  {wf.description}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <span className="text-xs font-bold text-slate-500">
                {wf.enabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                type="button"
                onClick={() => toggleWorkflow(wf.id)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
                  wf.enabled ? 'bg-[#5c34ad]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    wf.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Integration Info Card */}
      <div className="mt-8 p-5 bg-[#f8f5ff] border border-purple-100 rounded-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#5c34ad] text-white flex items-center justify-center shrink-0">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">Transactional Email Engine Connected</h4>
            <p className="text-[11px] text-slate-600">
              Emails and meeting invitations are delivered via Mailpit (Port 8025 in dev) / SMTP.
            </p>
          </div>
        </div>
        <a
          href="http://localhost:8025"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-bold text-[#5c34ad] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Open Mailpit Inbox</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Create Workflow Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-[#5c34ad]/10 text-[#5c34ad] flex items-center justify-center font-bold">
                  <Zap className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Create Workflow Automation</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWorkflow} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Workflow Name
                </label>
                <input
                  type="text"
                  value={newWfName}
                  onChange={(e) => setNewWfName(e.target.value)}
                  placeholder="e.g. 2-Hour SMS Reminder"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Trigger Event
                  </label>
                  <select
                    value={newWfTrigger}
                    onChange={(e) => setNewWfTrigger(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                  >
                    <option value="Booking Created">Booking Created</option>
                    <option value="Appointment Rescheduled">Appointment Rescheduled</option>
                    <option value="Appointment Cancelled">Appointment Cancelled</option>
                    <option value="24 Hours Before Appointment">24 Hours Before</option>
                    <option value="1 Hour Before Appointment">1 Hour Before</option>
                    <option value="Marked as Completed">Marked as Completed</option>
                    <option value="Marked as No-Show">Marked as No-Show</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Delivery Channel
                  </label>
                  <select
                    value={newWfChannel}
                    onChange={(e) => setNewWfChannel(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                  >
                    <option value="EMAIL">Email Notification</option>
                    <option value="SMS">SMS Text Alert</option>
                    <option value="WEBHOOK">Webhook POST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Recipient
                  </label>
                  <select
                    value={newWfRecipient}
                    onChange={(e) => setNewWfRecipient(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                  >
                    <option value="Client">Client</option>
                    <option value="Staff">Staff</option>
                    <option value="Both">Both Client & Staff</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Execution Timing
                  </label>
                  <select
                    value={newWfDelay}
                    onChange={(e) => setNewWfDelay(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                  >
                    <option value="Immediately">Immediately</option>
                    <option value="-24 Hours">24 Hours Prior</option>
                    <option value="-60 Minutes">1 Hour Prior</option>
                    <option value="+2 Hours">2 Hours Post-Meeting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Template Notes
                </label>
                <textarea
                  value={newWfDescription}
                  onChange={(e) => setNewWfDescription(e.target.value)}
                  placeholder="Automated notification sent to attendee with meeting link..."
                  rows={2}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-[#5c34ad]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#5c34ad] hover:bg-[#4d2994] rounded-xl shadow-md shadow-purple-600/20 transition-all flex items-center gap-1.5"
                >
                  <span>Save Workflow</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
