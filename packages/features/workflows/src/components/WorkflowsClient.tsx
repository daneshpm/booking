'use client';

import * as React from 'react';
import {
  Activity,
  Mail,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Plus,
  X,
  Trash2,
  Pencil,
  Webhook,
  Search,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';
import {
  createWorkflowAction,
  updateWorkflowAction,
  toggleWorkflowAction,
  deleteWorkflowAction,
} from '../api/workflow.actions';
import type { WorkflowInput } from '../api/workflow.schema';

export interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  serviceId: string | null;
  trigger: string;
  channel: string;
  recipient: string;
  offsetMinutes: number;
  subject: string | null;
  body: string | null;
  webhookUrl: string | null;
  isActive: boolean;
  lastRunAt: string | null;
}

export interface DeliveryItem {
  id: string;
  recipient: string;
  subject: string | null;
  status: string;
  error: string | null;
  createdAt: string;
}

export interface ServiceSummary {
  id: string;
  name: string;
  slug: string;
}

interface WorkflowsClientProps {
  workspaceId: string;
  initialWorkflows: WorkflowItem[];
  availableServices?: ServiceSummary[];
  mailConfigured: boolean;
  smsConfigured: boolean;
  recentDeliveries: DeliveryItem[];
}

const TRIGGER_LABELS: Record<string, string> = {
  BOOKING_CREATED: 'When appointment is booked',
  BOOKING_CANCELLED: 'When appointment is cancelled',
  BOOKING_RESCHEDULED: 'When appointment is rescheduled',
  BEFORE_APPOINTMENT: 'Before event starts',
  AFTER_APPOINTMENT: 'After event ends / marked complete',
};

const RECIPIENT_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  STAFF: 'Staff',
  BOTH: 'Customer & Staff',
};

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  WEBHOOK: Webhook,
};

const CHANNEL_ACTION_LABELS: Record<string, string> = {
  EMAIL: 'Send mail',
  SMS: 'Send SMS',
  WEBHOOK: 'Custom Logic / Webhook',
};

/** Render a signed minute offset as readable English. */
function describeTriggerOffset(trigger: string, offsetMinutes: number): string {
  if (trigger !== 'BEFORE_APPOINTMENT' && trigger !== 'AFTER_APPOINTMENT') {
    return TRIGGER_LABELS[trigger] ?? trigger;
  }
  const magnitude = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? 'before event starts' : 'after marked as complete';

  if (magnitude === 0) {
    return trigger === 'AFTER_APPOINTMENT' ? 'When marked as complete' : 'At the appointment time';
  }
  if (magnitude % 1440 === 0) {
    const days = magnitude / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'} ${direction}`;
  }
  if (magnitude % 60 === 0) {
    const hours = magnitude / 60;
    return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ${direction}`;
  }
  return `${magnitude} mins ${direction}`;
}

const WORKFLOW_PRESETS = [
  {
    name: 'Thank you mailer',
    description: 'Sends a thank you email after the consultation is completed.',
    trigger: 'AFTER_APPOINTMENT' as const,
    channel: 'EMAIL' as const,
    recipient: 'CUSTOMER' as const,
    offsetMinutes: 30,
    subject: 'Thank you for attending your session!',
    body: 'Hello {{customerName}}, thank you for joining us today for {{serviceName}}. Let us know if you need anything else!',
  },
  {
    name: 'Feedback survey mailer',
    description: 'Asks clients for their feedback right after the meeting.',
    trigger: 'AFTER_APPOINTMENT' as const,
    channel: 'EMAIL' as const,
    recipient: 'CUSTOMER' as const,
    offsetMinutes: 0,
    subject: 'How was your experience with {{workspaceName}}?',
    body: 'Hi {{customerName}}, we hope you enjoyed your {{serviceName}}. Please take a moment to share your feedback!',
  },
  {
    name: 'Reconfirmation SMS',
    description: 'Sends a quick SMS reminder 30 minutes before the start time.',
    trigger: 'BEFORE_APPOINTMENT' as const,
    channel: 'SMS' as const,
    recipient: 'CUSTOMER' as const,
    offsetMinutes: -30,
    subject: null,
    body: 'Reminder: Your appointment for {{serviceName}} starts in 30 minutes. Join link: {{meetingLink}}',
  },
  {
    name: 'Push Leads to CRM',
    description: 'Dispatches new booking details via webhook to your CRM.',
    trigger: 'BOOKING_CREATED' as const,
    channel: 'WEBHOOK' as const,
    recipient: 'STAFF' as const,
    offsetMinutes: 0,
    webhookUrl: 'https://api.crm.com/v1/bookings',
    subject: null,
    body: null,
  },
];

const EMPTY_FORM: WorkflowInput = {
  name: '',
  description: '',
  serviceId: '',
  trigger: 'BOOKING_CREATED',
  channel: 'EMAIL',
  recipient: 'CUSTOMER',
  offsetMinutes: 0,
  subject: '',
  body: '',
  webhookUrl: '',
  isActive: true,
};

export function WorkflowsClient({
  workspaceId,
  initialWorkflows,
  availableServices = [],
  mailConfigured,
  smsConfigured,
  recentDeliveries,
}: WorkflowsClientProps) {
  const [workflows, setWorkflows] = React.useState(initialWorkflows);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedEventType, setSelectedEventType] = React.useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<WorkflowInput>(EMPTY_FORM);
  const [error, setError] = React.useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = React.useState<WorkflowItem | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  React.useEffect(() => {
    setWorkflows(initialWorkflows);
  }, [initialWorkflows]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setIsModalOpen(true);
  };

  const applyPreset = (preset: (typeof WORKFLOW_PRESETS)[0]) => {
    setForm({
      name: preset.name,
      description: preset.description,
      serviceId: '',
      trigger: preset.trigger,
      channel: preset.channel,
      recipient: preset.recipient,
      offsetMinutes: preset.offsetMinutes,
      subject: preset.subject ?? '',
      body: preset.body ?? '',
      webhookUrl: preset.webhookUrl ?? '',
      isActive: true,
    });
  };

  const openEdit = (workflow: WorkflowItem) => {
    setEditingId(workflow.id);
    setForm({
      name: workflow.name,
      description: workflow.description ?? '',
      serviceId: workflow.serviceId ?? '',
      trigger: workflow.trigger as WorkflowInput['trigger'],
      channel: workflow.channel as WorkflowInput['channel'],
      recipient: workflow.recipient as WorkflowInput['recipient'],
      offsetMinutes: workflow.offsetMinutes,
      subject: workflow.subject ?? '',
      body: workflow.body ?? '',
      webhookUrl: workflow.webhookUrl ?? '',
      isActive: workflow.isActive,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload: WorkflowInput = {
        ...form,
        webhookUrl: form.channel === 'WEBHOOK' ? form.webhookUrl : null,
      };

      const res = editingId
        ? await updateWorkflowAction(workspaceId, editingId, payload)
        : await createWorkflowAction(workspaceId, payload);

      if (res.success) {
        setIsModalOpen(false);
      } else {
        setError(res.error ?? 'Could not save the workflow.');
      }
    });
  };

  const handleToggle = (workflow: WorkflowItem) => {
    const next = !workflow.isActive;
    setWorkflows((prev) => prev.map((w) => (w.id === workflow.id ? { ...w, isActive: next } : w)));

    startTransition(async () => {
      const res = await toggleWorkflowAction(workspaceId, workflow.id, next);
      if (!res.success) {
        setWorkflows((prev) =>
          prev.map((w) => (w.id === workflow.id ? { ...w, isActive: !next } : w))
        );
        setError(res.error ?? 'Could not update the workflow.');
      }
    });
  };

  const handleDelete = (workflow: WorkflowItem) => {
    setWorkflowToDelete(workflow);
  };

  const confirmDelete = (workflow: WorkflowItem) => {
    startTransition(async () => {
      const res = await deleteWorkflowAction(workspaceId, workflow.id);
      if (res.success) {
        setWorkflows((prev) => prev.filter((w) => w.id !== workflow.id));
        setSuccessMessage('Workflow deleted successfully.');
        setWorkflowToDelete(null);
      } else {
        setError(res.error ?? 'Could not delete the workflow.');
        setWorkflowToDelete(null);
      }
    });
  };

  const isTimeBased = form.trigger === 'BEFORE_APPOINTMENT' || form.trigger === 'AFTER_APPOINTMENT';

  const serviceNameById = new Map(availableServices.map((s) => [s.id, s.name]));

  const filteredWorkflows = workflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.description && w.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesEventType = selectedEventType === 'ALL' || w.serviceId === selectedEventType;
    return matchesSearch && matchesEventType;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-[#5c34ad]">
              <Activity className="h-5 w-5" />
            </div>
            Workflows
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automate pre-meeting notifications, post-meeting follow-ups via email and SMS, and sync
            data to your CRM.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200/90 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#5c34ad]/20 focus:border-[#5c34ad]"
            />
          </div>

          {/* Event Type Filter */}
          {availableServices.length > 0 && (
            <div className="relative shrink-0">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <select
                value={selectedEventType}
                onChange={(e) => setSelectedEventType(e.target.value)}
                className="pl-9 pr-8 py-2 text-xs border border-slate-200/90 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#5c34ad]/20 focus:border-[#5c34ad] appearance-none cursor-pointer"
              >
                <option value="ALL">All Event Types</option>
                {availableServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-colors cursor-pointer shrink-0"
          >
            <Plus className="h-4 w-4" />
            New Workflow
          </button>
        </div>
      </div>

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {!mailConfigured && (
        <div
          role="status"
          className="flex items-start gap-2 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 mt-px" />
          <span>
            Email delivery is not configured. Set SMTP_HOST and related environment variables to
            start sending. Workflows still record every attempt until then.
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
        >
          {error}
        </div>
      )}

      {/* Main Workflows Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-5">Workflow Name</th>
                <th className="py-3.5 px-4">Event Types</th>
                <th className="py-3.5 px-4">Triggers</th>
                <th className="py-3.5 px-4">Actions</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWorkflows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Zap className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-xs">
                      No workflows match your criteria
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click &quot;New Workflow&quot; to create your first automated trigger.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredWorkflows.map((workflow) => {
                  const Icon = CHANNEL_ICONS[workflow.channel] ?? Mail;
                  const actionLabel =
                    CHANNEL_ACTION_LABELS[workflow.channel] ?? 'Send Notification';
                  const triggerDescription = describeTriggerOffset(
                    workflow.trigger,
                    workflow.offsetMinutes
                  );

                  return (
                    <tr key={workflow.id} className="hover:bg-slate-50/60 transition-colors group">
                      {/* Workflow Name */}
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                              workflow.channel === 'EMAIL'
                                ? 'bg-purple-50 border-purple-100 text-[#5c34ad]'
                                : workflow.channel === 'SMS'
                                  ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                  : 'bg-blue-50 border-blue-100 text-blue-600'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block group-hover:text-[#5c34ad] transition-colors">
                              {workflow.name}
                            </span>
                            {workflow.description && (
                              <span className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                {workflow.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Event Types */}
                      <td className="py-4 px-4 text-slate-600">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[11px] px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-700">
                          <Layers className="h-3 w-3 text-slate-400" />
                          {workflow.serviceId
                            ? (serviceNameById.get(workflow.serviceId) ?? 'Deleted service')
                            : 'All Event Types'}
                        </span>
                      </td>

                      {/* Triggers */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700 text-xs">
                          <Clock className="h-3.5 w-3.5 text-[#5c34ad]" />
                          {triggerDescription}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
                          {actionLabel}
                          <span className="text-[11px] text-slate-400">
                            ({RECIPIENT_LABELS[workflow.recipient] ?? workflow.recipient})
                          </span>
                        </span>
                      </td>

                      {/* Status Switch Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(workflow)}
                          disabled={isPending}
                          role="switch"
                          aria-checked={workflow.isActive}
                          aria-label={`${workflow.isActive ? 'Disable' : 'Enable'} ${workflow.name}`}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                            workflow.isActive ? 'bg-[#5c34ad]' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              workflow.isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Manage Actions */}
                      <td className="py-4 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(workflow)}
                            aria-label={`Edit ${workflow.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(workflow)}
                            disabled={isPending}
                            aria-label={`Delete ${workflow.name}`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Outbound Deliveries */}
      {recentDeliveries.length > 0 && (
        <section className="pt-2">
          <h2 className="text-xs font-bold text-slate-800 mb-2">Recent notification deliveries</h2>
          <div className="overflow-x-auto border border-slate-200/90 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500 font-bold">
                <tr>
                  <th className="text-left px-4 py-2.5">Recipient</th>
                  <th className="text-left px-4 py-2.5">Subject</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-2.5 text-slate-700 font-medium">{delivery.recipient}</td>
                    <td className="px-4 py-2.5 text-slate-500">{delivery.subject ?? '—'}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          delivery.status === 'SENT' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                        title={delivery.error ?? undefined}
                      >
                        {delivery.status === 'SENT' ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        )}
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {new Date(delivery.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Modal: New / Edit Workflow */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in-50 duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {editingId ? 'Edit Workflow' : 'Create Custom Workflow'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Set triggers and automated actions to communicate seamlessly with clients.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Presets Strip (shown only when creating new) */}
            {!editingId && (
              <div className="p-4 bg-purple-50/50 border-b border-purple-100/60">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-[#5c34ad]" />
                  Quick Workflow Templates:
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {WORKFLOW_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="p-2 text-left rounded-xl bg-white border border-purple-100 hover:border-purple-300 hover:shadow-2xs text-[11px] transition-all cursor-pointer group"
                    >
                      <span className="font-bold text-slate-800 group-hover:text-[#5c34ad] block truncate">
                        {preset.name}
                      </span>
                      <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                        {preset.description}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="wf-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Workflow Name *
                </label>
                <input
                  id="wf-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Thank you mailer"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                />
              </div>

              <div>
                <label htmlFor="wf-desc" className="block text-xs font-bold text-slate-700 mb-1">
                  Description
                </label>
                <input
                  id="wf-desc"
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What this workflow is for"
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                />
              </div>

              {/* Event Types Target */}
              <div>
                <label htmlFor="wf-events" className="block text-xs font-bold text-slate-700 mb-1">
                  Event Types
                </label>
                <select
                  id="wf-events"
                  value={form.serviceId || 'ALL'}
                  onChange={(e) =>
                    setForm({ ...form, serviceId: e.target.value === 'ALL' ? '' : e.target.value })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#5c34ad]"
                >
                  <option value="ALL">All Event Types (Universal)</option>
                  {availableServices.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="wf-trigger"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Trigger *
                  </label>
                  <select
                    id="wf-trigger"
                    value={form.trigger}
                    onChange={(e) => {
                      const trigger = e.target.value as WorkflowInput['trigger'];
                      // The offset input only re-signs itself when its own value
                      // changes, so switching direction here without touching the
                      // number would otherwise leave a before-trigger with a
                      // positive offset (or vice versa) and fail validation with
                      // no visible reason.
                      const magnitude = Math.abs(form.offsetMinutes ?? 0);
                      const offsetMinutes =
                        trigger === 'BEFORE_APPOINTMENT'
                          ? -magnitude
                          : trigger === 'AFTER_APPOINTMENT'
                            ? magnitude
                            : form.offsetMinutes;
                      setForm({ ...form, trigger, offsetMinutes });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#5c34ad]"
                  >
                    {Object.entries(TRIGGER_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="wf-recipient"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Recipient *
                  </label>
                  <select
                    id="wf-recipient"
                    value={form.recipient}
                    onChange={(e) =>
                      setForm({ ...form, recipient: e.target.value as WorkflowInput['recipient'] })
                    }
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#5c34ad]"
                  >
                    {Object.entries(RECIPIENT_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isTimeBased && (
                <div>
                  <label
                    htmlFor="wf-offset"
                    className="block text-xs font-bold text-slate-700 mb-1"
                  >
                    Minutes {form.trigger === 'BEFORE_APPOINTMENT' ? 'before' : 'after'} the
                    appointment *
                  </label>
                  <input
                    id="wf-offset"
                    type="number"
                    value={Math.abs(form.offsetMinutes ?? 0)}
                    min={0}
                    max={43200}
                    onChange={(e) => {
                      const magnitude = Math.abs(Number(e.target.value) || 0);
                      setForm({
                        ...form,
                        offsetMinutes:
                          form.trigger === 'BEFORE_APPOINTMENT' ? -magnitude : magnitude,
                      });
                    }}
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    0 = Immediately upon event. 30 = 30 minutes. 1440 = 1 day.
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="wf-channel" className="block text-xs font-bold text-slate-700 mb-1">
                  Action Channel *
                </label>
                <select
                  id="wf-channel"
                  value={form.channel}
                  onChange={(e) =>
                    setForm({ ...form, channel: e.target.value as WorkflowInput['channel'] })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#5c34ad]"
                >
                  <option value="EMAIL">Send mail (Email)</option>
                  <option value="SMS">Send SMS</option>
                  <option value="WEBHOOK">Custom Logic / Webhook</option>
                </select>
              </div>

              {form.channel === 'WEBHOOK' && (
                <div>
                  <label htmlFor="wf-hook" className="block text-xs font-bold text-slate-700 mb-1">
                    Webhook Destination URL *
                  </label>
                  <input
                    id="wf-hook"
                    type="url"
                    value={form.webhookUrl ?? ''}
                    onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                    placeholder="https://api.crm.com/v1/lead-ingest"
                    className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                  />
                </div>
              )}

              {form.channel === 'EMAIL' && (
                <>
                  <div>
                    <label
                      htmlFor="wf-subject"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Subject Line
                    </label>
                    <input
                      id="wf-subject"
                      value={form.subject ?? ''}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="e.g. Thank you for your appointment"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="wf-body"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Message Body
                    </label>
                    <textarea
                      id="wf-body"
                      rows={4}
                      value={form.body ?? ''}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Hello {{customerName}}, thank you for attending {{serviceName}}."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Placeholders: customerName, staffName, serviceName, workspaceName, date, time,
                      meetingLink.
                    </span>
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-[#5c34ad] focus:ring-[#5c34ad]"
                />
                <span className="font-semibold">Enable workflow immediately</span>
              </label>

              {error && (
                <div role="alert" className="text-[11px] text-rose-600 font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-semibold text-slate-600 px-3.5 py-2 rounded-xl hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-xs font-bold text-white bg-[#5c34ad] hover:bg-[#4d2994] px-4 py-2 rounded-xl disabled:opacity-60 cursor-pointer shadow-xs"
                >
                  {isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create Workflow'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {workflowToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Workflow</h3>
                <p className="text-[11px] text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to delete{' '}
              <strong className="text-slate-900">&ldquo;{workflowToDelete.name}&rdquo;</strong>?
              Automated triggers for this workflow will stop immediately.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPending}
                onClick={() => setWorkflowToDelete(null)}
                className="text-xs font-semibold text-slate-600 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => confirmDelete(workflowToDelete)}
                className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? 'Deleting...' : 'Delete Workflow'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
