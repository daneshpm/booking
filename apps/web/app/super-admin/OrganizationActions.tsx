'use client';

import * as React from 'react';
import { Badge, Button, Modal } from '@bookings/ui';
import type { BillingStatus } from '@bookings/database';
import {
  setOrganizationActiveAction,
  updateBillingStatusAction,
  updateOrganizationFeatureAction,
  type OrganizationFeature,
} from './actions';

const FEATURE_TOGGLES: { key: OrganizationFeature; label: string }[] = [
  { key: 'workflowsEnabled', label: 'Workflows' },
  { key: 'analyticsEnabled', label: 'Analytics' },
  { key: 'dataExportEnabled', label: 'Data export' },
  { key: 'bookingPagesEnabled', label: 'Booking pages' },
];

interface OrganizationActionsProps {
  workspaceId: string;
  workspaceName: string;
  isActive: boolean;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
  workflowsEnabled: boolean;
  analyticsEnabled: boolean;
  dataExportEnabled: boolean;
  bookingPagesEnabled: boolean;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function OrganizationStatusBadges({
  isActive,
  billingStatus,
  trialEndsAt,
}: Pick<OrganizationActionsProps, 'isActive' | 'billingStatus' | 'trialEndsAt'>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge variant={isActive ? 'success' : 'default'}>
        {isActive ? 'Active' : 'Deactivated'}
      </Badge>
      <Badge variant={billingStatus === 'SUBSCRIBED' ? 'success' : 'warning'}>
        {billingStatus === 'SUBSCRIBED'
          ? 'Subscribed'
          : trialEndsAt
            ? `Trial · ends ${formatDate(trialEndsAt)}`
            : 'Trial'}
      </Badge>
    </div>
  );
}

export function OrganizationActions({
  workspaceId,
  workspaceName,
  isActive,
  billingStatus,
  workflowsEnabled,
  analyticsEnabled,
  dataExportEnabled,
  bookingPagesEnabled,
}: OrganizationActionsProps) {
  const [pending, startTransition] = React.useTransition();
  const [confirmingDeactivate, setConfirmingDeactivate] = React.useState(false);
  const [editingFeatures, setEditingFeatures] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [features, setFeatures] = React.useState({
    workflowsEnabled,
    analyticsEnabled,
    dataExportEnabled,
    bookingPagesEnabled,
  });

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await setOrganizationActiveAction(workspaceId, !isActive);
      if (!result.success) setError(result.error);
      setConfirmingDeactivate(false);
    });
  }

  function toggleBilling() {
    setError(null);
    const next: BillingStatus = billingStatus === 'SUBSCRIBED' ? 'TRIAL' : 'SUBSCRIBED';
    startTransition(async () => {
      const result = await updateBillingStatusAction(workspaceId, next);
      if (!result.success) setError(result.error);
    });
  }

  function toggleFeature(key: OrganizationFeature) {
    const next = !features[key];
    setFeatures((prev) => ({ ...prev, [key]: next }));
    startTransition(async () => {
      const result = await updateOrganizationFeatureAction(workspaceId, key, next);
      if (!result.success) {
        setFeatures((prev) => ({ ...prev, [key]: !next }));
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditingFeatures(true)}
          className="text-[11px] font-bold text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          Features
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={toggleBilling}
          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
        >
          Mark {billingStatus === 'SUBSCRIBED' ? 'Trial' : 'Subscribed'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => (isActive ? setConfirmingDeactivate(true) : toggleActive())}
          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 disabled:opacity-50"
        >
          {isActive ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>
      {error && <span className="text-[10px] text-rose-600">{error}</span>}

      <Modal
        isOpen={editingFeatures}
        onClose={() => setEditingFeatures(false)}
        title={`Features for ${workspaceName}`}
        description="Turning a module off hides it from the sidebar and blocks its pages/actions directly, even if called by hand."
        maxWidth="sm"
      >
        <div className="space-y-2.5 mt-1">
          {FEATURE_TOGGLES.map((f) => (
            <label
              key={f.key}
              className="flex items-center justify-between gap-3 py-1 cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-700">{f.label}</span>
              <input
                type="checkbox"
                checked={features[f.key]}
                disabled={pending}
                onChange={() => toggleFeature(f.key)}
                className="h-4 w-4 rounded border-slate-300 text-[#5c34ad] focus:ring-[#5c34ad]"
              />
            </label>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setEditingFeatures(false)}>
            Done
          </Button>
        </div>
      </Modal>

      <Modal
        isOpen={confirmingDeactivate}
        onClose={() => setConfirmingDeactivate(false)}
        title={`Deactivate ${workspaceName}?`}
        description="Every booking, customer and staff record stays intact. Its members lose access and its public booking page stops resolving until you reactivate it."
        maxWidth="sm"
      >
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" onClick={() => setConfirmingDeactivate(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={pending} onClick={toggleActive}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </div>
  );
}
