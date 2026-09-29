'use client';

import * as React from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Badge, Button, Input, Label, Modal, Select, Textarea } from '@bookings/ui';
import type { BillingPeriod } from '@bookings/database';
import {
  createPlanAction,
  updatePlanAction,
  deletePlanAction,
  getPlansAction,
  type PlanSummary,
  type PlanInput,
} from '../actions';

interface PlansClientProps {
  initialPlans: PlanSummary[];
}

/** Overrides the shared Button's generic blue "primary" with the app's actual brand purple. */
const BRAND_BUTTON =
  'bg-none bg-[#5c34ad] hover:bg-[#4d2994] shadow-[#5c34ad]/25 focus:ring-[#5c34ad]';

const EMPTY_FORM: PlanInput = {
  name: '',
  price: '',
  currency: 'INR',
  billingPeriod: 'MONTHLY',
  features: [],
  displayOrder: 0,
  isPublished: true,
};

function toFormState(plan: PlanSummary): PlanInput {
  return {
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    billingPeriod: plan.billingPeriod,
    features: plan.features,
    displayOrder: plan.displayOrder,
    isPublished: plan.isPublished,
  };
}

export function PlansClient({ initialPlans }: PlansClientProps) {
  const [plans, setPlans] = React.useState(initialPlans);
  const [pending, startTransition] = React.useTransition();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [isCreating, setIsCreating] = React.useState(false);
  const [form, setForm] = React.useState<PlanInput>(EMPTY_FORM);
  const [featuresText, setFeaturesText] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = React.useState<string | null>(null);

  const isFormOpen = isCreating || editingId !== null;

  function openCreate() {
    setForm({ ...EMPTY_FORM, displayOrder: plans.length });
    setFeaturesText('');
    setError(null);
    setIsCreating(true);
  }

  function openEdit(plan: PlanSummary) {
    setForm(toFormState(plan));
    setFeaturesText(plan.features.join('\n'));
    setError(null);
    setEditingId(plan.id);
  }

  function closeForm() {
    setIsCreating(false);
    setEditingId(null);
  }

  function submit() {
    setError(null);
    const input: PlanInput = {
      ...form,
      features: featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean),
    };

    startTransition(async () => {
      const result = editingId
        ? await updatePlanAction(editingId, input)
        : await createPlanAction(input);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const refreshed = await getPlansAction();
      if (refreshed.success) setPlans(refreshed.plans);
      closeForm();
    });
  }

  function confirmDelete() {
    if (!confirmingDeleteId) return;
    const id = confirmingDeleteId;
    startTransition(async () => {
      const result = await deletePlanAction(id);
      if (result.success) {
        setPlans((prev) => prev.filter((p) => p.id !== id));
      }
      setConfirmingDeleteId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate} className={BRAND_BUTTON}>
          <Plus className="h-4 w-4" />
          New plan
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {plans.length === 0 ? (
          <div className="px-4 py-10 text-center text-slate-400 text-sm">No plans yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {plans.map((plan) => (
              <div key={plan.id} className="flex items-center justify-between px-5 py-4 gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="h-6 w-6 rounded-full bg-[#5c34ad]/10 text-[#5c34ad] text-[11px] font-bold flex items-center justify-center shrink-0"
                    title="Display order (edit to reorder)"
                  >
                    {plan.displayOrder}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{plan.name}</span>
                      {!plan.isPublished && (
                        <Badge variant="default" className="text-[10px]">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {plan.currency} {plan.price} /{' '}
                      {plan.billingPeriod === 'MONTHLY' ? 'month' : 'year'} · {plan.features.length}{' '}
                      feature{plan.features.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(plan)}
                    className="text-slate-500 hover:text-slate-900"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDeleteId(plan.id)}
                    className="text-slate-400 hover:text-rose-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingId ? 'Edit plan' : 'New plan'}
        maxWidth="md"
      >
        <div className="space-y-4">
          <div>
            <Label required>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Pro"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label required>Price</Label>
              <Input
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="999.00"
                inputMode="decimal"
              />
            </div>
            <div>
              <Label required>Currency</Label>
              <Input
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                placeholder="INR"
                maxLength={3}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Billing period</Label>
              <Select
                value={form.billingPeriod}
                onChange={(e) =>
                  setForm({ ...form, billingPeriod: e.target.value as BillingPeriod })
                }
              >
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </div>
            <div>
              <Label>Display order</Label>
              <Input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label>Features (one per line)</Label>
            <Textarea
              value={featuresText}
              onChange={(e) => setFeaturesText(e.target.value)}
              rows={5}
              placeholder={'Unlimited bookings\nSMS reminders\nPriority support'}
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 accent-[#5c34ad] focus:ring-[#5c34ad]"
            />
            <span className="text-sm text-slate-700">Published (visible on the landing page)</span>
          </label>

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={closeForm}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending} className={BRAND_BUTTON}>
              {editingId ? 'Save' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={confirmingDeleteId !== null}
        onClose={() => setConfirmingDeleteId(null)}
        title="Delete this plan?"
        description="It disappears from the public landing page immediately. This does not affect any organization's billing status."
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setConfirmingDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={pending} onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
