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
} from 'lucide-react';
import {
  createWorkflowAction,
  updateWorkflowAction,
  toggleWorkflowAction,
  deleteWorkflowAction,
  type WorkflowInput,
} from './actions';

export interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
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

interface WorkflowsClientProps {
  workspaceId: string;
  initialWorkflows: WorkflowItem[];
  mailConfigured: boolean;
  smsConfigured: boolean;
  recentDeliveries: DeliveryItem[];
}

const TRIGGER_LABELS: Record<string, string> = {
  BOOKING_CREATED: 'When a booking is created',
  BOOKING_CANCELLED: 'When a booking is cancelled',
  BOOKING_RESCHEDULED: 'When a booking is rescheduled',
  BEFORE_APPOINTMENT: 'Before the appointment',
  AFTER_APPOINTMENT: 'After the appointment',
};

const RECIPIENT_LABELS: Record<string, string> = {
  CUSTOMER: 'Customer',
  STAFF: 'Staff',
  BOTH: 'Customer and staff',
};

const CHANNEL_ICONS: Record<string, typeof Mail> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  WEBHOOK: Webhook,
};

/** Render a signed minute offset as readable English. */
function describeOffset(trigger: string, offsetMinutes: number): string {
  if (trigger !== 'BEFORE_APPOINTMENT' && trigger !== 'AFTER_APPOINTMENT') {
    return 'Immediately';
  }
  const magnitude = Math.abs(offsetMinutes);
  const direction = offsetMinutes < 0 ? 'before' : 'after';

  if (magnitude === 0) return 'At the appointment time';
  if (magnitude % 1440 === 0) {
    const days = magnitude / 1440;
    return `${days} ${days === 1 ? 'day' : 'days'} ${direction}`;
  }
  if (magnitude % 60 === 0) {
    const hours = magnitude / 60;
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ${direction}`;
  }
  return `${magnitude} minutes ${direction}`;
}

const EMPTY_FORM: WorkflowInput = {
  name: '',
  description: '',
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
  mailConfigured,
  smsConfigured,
  recentDeliveries,
}: WorkflowsClientProps) {
  const [workflows, setWorkflows] = React.useState(initialWorkflows);
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

  const openEdit = (workflow: WorkflowItem) => {
    setEditingId(workflow.id);
    setForm({
      name: workflow.name,
      description: workflow.description ?? '',
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
    // Reflect the change immediately, then roll it back if the server refuses.
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
            <Activity className="h-5 w-5 text-[#5c34ad]" />
            Workflows
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Automated messages sent when appointments are booked, cancelled, or coming up.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-sm transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          New workflow
        </button>
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
            Email delivery is not configured. Set SMTP_HOST and the related environment variables to
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

      {workflows.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-2xl p-10 text-center">
          <Zap className="h-6 w-6 text-slate-300 mx-auto" />
          <h2 className="mt-3 text-sm font-bold text-slate-800">No workflows yet</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Booking confirmations and cancellation notices are sent automatically. Add a workflow to
            send reminders or follow-ups as well.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {workflows.map((workflow) => {
            const Icon = CHANNEL_ICONS[workflow.channel] ?? Mail;
            return (
              <li
                key={workflow.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-8 w-8 rounded-lg bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-[#5c34ad]" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs font-bold text-slate-900">{workflow.name}</h3>
                      {workflow.description && (
                        <p className="text-[11px] text-slate-500 mt-0.5">{workflow.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px] text-slate-500">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                          {TRIGGER_LABELS[workflow.trigger] ?? workflow.trigger}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                          <Clock className="h-2.5 w-2.5" />
                          {describeOffset(workflow.trigger, workflow.offsetMinutes)}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-semibold">
                          To {RECIPIENT_LABELS[workflow.recipient] ?? workflow.recipient}
                        </span>
                        {workflow.lastRunAt && (
                          <span className="text-slate-400">
                            Last run {new Date(workflow.lastRunAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggle(workflow)}
                      disabled={isPending}
                      role="switch"
                      aria-checked={workflow.isActive}
                      aria-label={`${workflow.isActive ? 'Disable' : 'Enable'} ${workflow.name}`}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                        workflow.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          workflow.isActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(workflow)}
                      aria-label={`Edit ${workflow.name}`}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(workflow)}
                      disabled={isPending}
                      aria-label={`Delete ${workflow.name}`}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {recentDeliveries.length > 0 && (
        <section className="pt-2">
          <h2 className="text-xs font-bold text-slate-800 mb-2">Recent deliveries</h2>
          <div className="overflow-x-auto border border-slate-200 rounded-2xl">
            <table className="w-full text-[11px]">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left font-bold px-3 py-2">Recipient</th>
                  <th className="text-left font-bold px-3 py-2">Subject</th>
                  <th className="text-left font-bold px-3 py-2">Status</th>
                  <th className="text-left font-bold px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {recentDeliveries.map((delivery) => (
                  <tr key={delivery.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-slate-700">{delivery.recipient}</td>
                    <td className="px-3 py-2 text-slate-500">{delivery.subject ?? '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          delivery.status === 'SENT' ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                        title={delivery.error ?? undefined}
                      >
                        {delivery.status === 'SENT' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <AlertTriangle className="h-3 w-3" />
                        )}
                        {delivery.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-400">
                      {new Date(delivery.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit workflow' : 'New workflow'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label htmlFor="wf-name" className="block text-xs font-bold text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  id="wf-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. 24-hour reminder"
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
                      // The sign encodes the direction, so switching between
                      // before and after has to flip it. Left alone, the field
                      // read "60 minutes before" while submitting +60, which
                      // the server then rejected.
                      const magnitude = Math.abs(form.offsetMinutes ?? 0);
                      const offsetMinutes =
                        trigger === 'BEFORE_APPOINTMENT'
                          ? -magnitude
                          : trigger === 'AFTER_APPOINTMENT'
                            ? magnitude
                            : 0;
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
                    Send to *
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
                    min={1}
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
                    1440 minutes is one day.
                  </span>
                </div>
              )}

              <div>
                <label htmlFor="wf-channel" className="block text-xs font-bold text-slate-700 mb-1">
                  Channel *
                </label>
                <select
                  id="wf-channel"
                  value={form.channel}
                  onChange={(e) =>
                    setForm({ ...form, channel: e.target.value as WorkflowInput['channel'] })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#5c34ad]"
                >
                  <option value="EMAIL">Email</option>
                  <option value="WEBHOOK">Webhook</option>
                  <option value="SMS">SMS</option>
                </select>
                {form.channel === 'SMS' && !smsConfigured && (
                  <span className="text-[10px] text-amber-600 mt-1 block">
                    No SMS gateway is configured, so these are recorded but not delivered. Set
                    SMS_GATEWAY_DOMAIN, alongside your SMTP settings, to start sending.
                  </span>
                )}
                {form.channel === 'SMS' && smsConfigured && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Sent over SMTP through your email-to-SMS gateway, to recipients who have an
                    international phone number on file.
                  </span>
                )}
                {form.channel === 'WEBHOOK' && (
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Signed with HMAC-SHA256 when WEBHOOK_SIGNING_SECRET is set. Private and reserved
                    addresses are refused.
                  </span>
                )}
              </div>

              {form.channel === 'WEBHOOK' && (
                <div>
                  <label htmlFor="wf-hook" className="block text-xs font-bold text-slate-700 mb-1">
                    Webhook URL *
                  </label>
                  <input
                    id="wf-hook"
                    type="url"
                    value={form.webhookUrl ?? ''}
                    onChange={(e) => setForm({ ...form, webhookUrl: e.target.value })}
                    placeholder="https://example.com/hooks/bookings"
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
                      Subject
                    </label>
                    <input
                      id="wf-subject"
                      value={form.subject ?? ''}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="Leave blank to use the default wording"
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="wf-body"
                      className="block text-xs font-bold text-slate-700 mb-1"
                    >
                      Message
                    </label>
                    <textarea
                      id="wf-body"
                      rows={4}
                      value={form.body ?? ''}
                      onChange={(e) => setForm({ ...form, body: e.target.value })}
                      placeholder="Hello {{customerName}}, your {{serviceName}} is on {{date}} at {{time}}."
                      className="w-full text-xs px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#5c34ad]"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Available placeholders: customerName, staffName, serviceName, workspaceName,
                      date, time, endTime, timezone, meetingLink, location.
                    </span>
                  </div>
                </>
              )}

              <label className="flex items-center gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={form.isActive ?? true}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Active
              </label>

              {error && (
                <div role="alert" className="text-[11px] text-rose-600 font-medium">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs font-semibold text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="text-xs font-bold text-white bg-[#5c34ad] hover:bg-[#4d2994] px-4 py-2 rounded-xl disabled:opacity-60"
                >
                  {isPending ? 'Saving...' : editingId ? 'Save changes' : 'Create workflow'}
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
                className="text-xs font-semibold text-slate-600 px-3.5 py-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => confirmDelete(workflowToDelete)}
                className="text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
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
