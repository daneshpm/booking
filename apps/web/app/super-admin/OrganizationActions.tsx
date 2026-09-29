'use client';

import * as React from 'react';
import { Badge, Button, Modal } from '@bookings/ui';
import type { BillingStatus } from '@bookings/database';
import { setOrganizationActiveAction, updateBillingStatusAction } from './actions';

interface OrganizationActionsProps {
  workspaceId: string;
  workspaceName: string;
  isActive: boolean;
  billingStatus: BillingStatus;
  trialEndsAt: string | null;
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
      <Badge variant={isActive ? 'success' : 'default'}>{isActive ? 'Active' : 'Deactivated'}</Badge>
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
}: OrganizationActionsProps) {
  const [pending, startTransition] = React.useTransition();
  const [confirmingDeactivate, setConfirmingDeactivate] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

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

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
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
