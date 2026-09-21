import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { __setCookie, __resetRequestContext } from './stubs/next-headers';
import { resetDatabase, createTenant, nextWeekdayAt, type TestTenant } from './helpers';

import {
  updateBookingStatusAction,
  rescheduleBookingAction,
} from '../../app/(dashboard)/calendar/actions';
import {
  updateAppointmentStatusAction,
  createDashboardAppointmentAction,
} from '../../app/(dashboard)/appointments/actions';
import {
  updateStaffAction,
  deleteStaffAction,
  toggleStaffStatusAction,
} from '../../app/(dashboard)/staff/actions';
import { updateWorkspaceSettingsAction } from '../../app/(dashboard)/settings/actions';
import { exportAppointmentsAction } from '../../app/(dashboard)/export/actions';

/**
 * Cross-tenant access, asserted at the server actions themselves.
 *
 * tenant-isolation.spec.ts proves the guard rejects a foreign workspace id.
 * That is necessary but not sufficient: the guarantee in practice depends on
 * every action remembering to call the guard *and* re-scoping the ids it was
 * handed. A single action that validates the workspace and then looks a
 * booking up by bare id is a tenant breach that a guard-level test cannot
 * see.
 *
 * Two attack shapes are covered for each resource:
 *
 *   1. alpha's session presenting beta's workspaceId
 *   2. alpha's session presenting alpha's *own* workspaceId alongside beta's
 *      resource id — the subtler one, and the one that catches an unscoped
 *      query
 */
describe('cross-tenant access through dashboard server actions', () => {
  let alpha: TestTenant;
  let beta: TestTenant;
  let betaBookingId: string;
  let betaCustomerId: string;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    __resetRequestContext();
  });

  beforeEach(async () => {
    await resetDatabase();
    __resetRequestContext();

    alpha = await createTenant('alpha');
    beta = await createTenant('beta');

    const customer = await prisma.customer.create({
      data: {
        workspaceId: beta.workspaceId,
        name: 'Beta Customer',
        email: 'beta-cust@example.com',
      },
    });
    betaCustomerId = customer.id;

    const start = nextWeekdayAt(10);
    const booking = await prisma.booking.create({
      data: {
        workspaceId: beta.workspaceId,
        serviceId: beta.serviceId,
        staffId: beta.staffId,
        customerId: customer.id,
        startTime: start,
        endTime: new Date(start.getTime() + 30 * 60_000),
        customerTimezone: 'Asia/Kolkata',
        status: 'CONFIRMED',
      },
    });
    betaBookingId = booking.id;

    // Everything below runs as a fully signed-in, legitimate user of alpha.
    __setCookie('rb_session', alpha.sessionToken);
  });

  /**
   * Server actions report refusal as `{ success: false }` rather than
   * throwing, but a guard that throws is an equally valid refusal. Both count
   * as denied; what must never happen is a silent success.
   */
  async function expectDenied(run: () => Promise<{ success: boolean } | unknown>): Promise<void> {
    let result: { success?: boolean } | undefined;
    try {
      result = (await run()) as { success?: boolean };
    } catch {
      return; // threw: denied
    }
    expect(result?.success).toBe(false);
  }

  describe('bookings', () => {
    it("refuses to change the status of another tenant's booking", async () => {
      await expectDenied(() => updateBookingStatusAction(betaBookingId, 'CANCELLED'));

      const after = await prisma.booking.findUnique({ where: { id: betaBookingId } });
      expect(after!.status).toBe('CONFIRMED');
    });

    it("refuses to reschedule another tenant's booking", async () => {
      const before = await prisma.booking.findUnique({ where: { id: betaBookingId } });

      await expectDenied(() => rescheduleBookingAction(betaBookingId, '2027-01-11', '14:00'));

      const after = await prisma.booking.findUnique({ where: { id: betaBookingId } });
      expect(after!.startTime.toISOString()).toBe(before!.startTime.toISOString());
    });

    it("refuses to change the status of another tenant's booking from the appointments page", async () => {
      await expectDenied(() => updateAppointmentStatusAction(betaBookingId, 'CANCELLED'));

      const after = await prisma.booking.findUnique({ where: { id: betaBookingId } });
      expect(after!.status).toBe('CONFIRMED');
    });

    it("refuses to create an appointment inside another tenant's workspace", async () => {
      await expectDenied(() =>
        createDashboardAppointmentAction({
          workspaceId: beta.workspaceId,
          serviceId: beta.serviceId,
          staffId: beta.staffId,
          date: '2027-01-11',
          time: '11:00',
          customerName: 'Intruder',
          customerEmail: 'intruder@example.com',
        })
      );

      const count = await prisma.booking.count({ where: { workspaceId: beta.workspaceId } });
      expect(count).toBe(1); // only the one seeded above
    });

    it("refuses to attach another tenant's service and staff to its own workspace", async () => {
      // The subtle shape: the workspace id is legitimately alpha's, so the
      // guard passes. Only a scoped lookup of serviceId/staffId catches this.
      await expectDenied(() =>
        createDashboardAppointmentAction({
          workspaceId: alpha.workspaceId,
          serviceId: beta.serviceId,
          staffId: beta.staffId,
          date: '2027-01-11',
          time: '12:00',
          customerName: 'Intruder',
          customerEmail: 'intruder2@example.com',
        })
      );

      const leaked = await prisma.booking.count({
        where: { workspaceId: alpha.workspaceId, serviceId: beta.serviceId },
      });
      expect(leaked).toBe(0);
    });
  });

  describe('staff', () => {
    it("refuses to edit another tenant's staff member via their workspace id", async () => {
      await expectDenied(() =>
        updateStaffAction(beta.workspaceId, beta.staffId, {
          name: 'Renamed By Intruder',
          email: 'intruder@example.com',
        })
      );

      const after = await prisma.staff.findUnique({ where: { id: beta.staffId } });
      expect(after!.name).not.toBe('Renamed By Intruder');
    });

    it("refuses to edit another tenant's staff member under its own workspace id", async () => {
      await expectDenied(() =>
        updateStaffAction(alpha.workspaceId, beta.staffId, {
          name: 'Renamed By Intruder',
          email: 'intruder@example.com',
        })
      );

      const after = await prisma.staff.findUnique({ where: { id: beta.staffId } });
      expect(after!.name).not.toBe('Renamed By Intruder');
      expect(after!.workspaceId).toBe(beta.workspaceId);
    });

    it("refuses to delete another tenant's staff member", async () => {
      await expectDenied(() => deleteStaffAction(alpha.workspaceId, beta.staffId));
      await expectDenied(() => deleteStaffAction(beta.workspaceId, beta.staffId));

      const survivor = await prisma.staff.findUnique({ where: { id: beta.staffId } });
      expect(survivor).not.toBeNull();
    });

    it("refuses to deactivate another tenant's staff member", async () => {
      await expectDenied(() => toggleStaffStatusAction(alpha.workspaceId, beta.staffId, false));

      const after = await prisma.staff.findUnique({ where: { id: beta.staffId } });
      expect(after!.isActive).toBe(true);
    });
  });

  describe('workspace settings', () => {
    it("refuses to rename another tenant's workspace", async () => {
      await expectDenied(() =>
        updateWorkspaceSettingsAction(beta.workspaceId, {
          name: 'Stolen Workspace',
          timezone: 'Asia/Kolkata',
          currency: 'INR',
        })
      );

      const after = await prisma.workspace.findUnique({ where: { id: beta.workspaceId } });
      expect(after!.name).not.toBe('Stolen Workspace');
    });
  });

  describe('data export', () => {
    it("refuses to export another tenant's appointments", async () => {
      // Export is the highest-value target in the product: one call would
      // hand over every customer name, email and phone number a tenant has.
      await expectDenied(() =>
        exportAppointmentsAction(beta.workspaceId, {
          dateFrom: '2020-01-01',
          dateTo: '2030-01-01',
          fields: ['customerName', 'customerEmail', 'customerPhone'],
          format: 'csv',
          includeCustomFields: false,
        })
      );
    });

    it("does not leak another tenant's rows through its own export", async () => {
      // Exporting alpha's own data is allowed; it must simply contain none of
      // beta's. Asserted on the decoded file rather than on a status code.
      const result = (await exportAppointmentsAction(alpha.workspaceId, {
        dateFrom: '2020-01-01',
        dateTo: '2030-01-01',
        fields: ['customerName', 'customerEmail'],
        format: 'csv',
        includeCustomFields: false,
      })) as { success: boolean; base64?: string };

      expect(result.success).toBe(true);
      const csv = Buffer.from(result.base64!, 'base64').toString('utf8');
      expect(csv).not.toContain('beta-cust@example.com');
      expect(csv).not.toContain('Beta Customer');
    });
  });

  describe('the seeded fixtures are genuinely separate tenants', () => {
    it('keeps alpha and beta in different workspaces', () => {
      // Guards the tests above: if the factory ever returned one shared
      // workspace, every assertion here would pass for the wrong reason.
      expect(alpha.workspaceId).not.toBe(beta.workspaceId);
      expect(alpha.staffId).not.toBe(beta.staffId);
      expect(alpha.serviceId).not.toBe(beta.serviceId);
      expect(betaCustomerId).toBeTruthy();
    });
  });

  /**
   * Positive controls.
   *
   * Every assertion above accepts any failure as proof of refusal, which
   * would also pass if the arguments were simply malformed and the action
   * rejected them for an unrelated reason. These run the *same* actions with
   * the *same* argument shapes against alpha's own resources: they must
   * succeed. Together with the refusals above, that pins the denial to
   * tenancy rather than to a validation error.
   */
  describe('positive controls — the same calls succeed on own resources', () => {
    it('allows editing its own staff member', async () => {
      const result = await updateStaffAction(alpha.workspaceId, alpha.staffId, {
        name: 'Legitimately Renamed',
        email: alpha.email,
      });

      expect(result.success).toBe(true);
      const after = await prisma.staff.findUnique({ where: { id: alpha.staffId } });
      expect(after!.name).toBe('Legitimately Renamed');
    });

    it('allows renaming its own workspace', async () => {
      const result = await updateWorkspaceSettingsAction(alpha.workspaceId, {
        name: 'Legitimately Renamed Workspace',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
      });

      expect(result.success).toBe(true);
      const after = await prisma.workspace.findUnique({ where: { id: alpha.workspaceId } });
      expect(after!.name).toBe('Legitimately Renamed Workspace');
    });

    it('allows creating an appointment in its own workspace', async () => {
      const result = await createDashboardAppointmentAction({
        workspaceId: alpha.workspaceId,
        serviceId: alpha.serviceId,
        staffId: alpha.staffId,
        date: '2027-01-11',
        time: '13:00',
        customerName: 'Legitimate Customer',
        customerEmail: 'legit@example.com',
      });

      expect(result.success).toBe(true);
      expect(await prisma.booking.count({ where: { workspaceId: alpha.workspaceId } })).toBe(1);
    });

    it('allows changing the status of its own booking', async () => {
      const created = await createDashboardAppointmentAction({
        workspaceId: alpha.workspaceId,
        serviceId: alpha.serviceId,
        staffId: alpha.staffId,
        date: '2027-01-12',
        time: '15:00',
        customerName: 'Legitimate Customer',
        customerEmail: 'legit2@example.com',
      });
      expect(created.success).toBe(true);

      const result = await updateBookingStatusAction(created.bookingId!, 'COMPLETED');

      expect(result.success).toBe(true);
      const after = await prisma.booking.findUnique({ where: { id: created.bookingId! } });
      expect(after!.status).toBe('COMPLETED');
    });
  });
});
