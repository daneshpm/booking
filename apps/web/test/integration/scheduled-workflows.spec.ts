import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { prisma } from '@bookings/database';
import { runScheduledWorkflows } from '@bookings/notifications';
import { resetDatabase, createTenant, type TestTenant } from './helpers';

/**
 * The reminder worker against a real database.
 *
 * The property that matters most is exactly-once delivery. A reminder sent
 * twice is worse than one sent late, and the claim that prevents it is a unique
 * index, so it can only be verified against a real PostgreSQL.
 */
describe('scheduled workflows', () => {
  let tenant: TestTenant;

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
    tenant = await createTenant('reminder');
  });

  async function makeBooking(startTime: Date, status: 'CONFIRMED' | 'CANCELLED' = 'CONFIRMED') {
    const customer = await prisma.customer.create({
      data: {
        workspaceId: tenant.workspaceId,
        name: 'Ravi Shankar',
        email: `ravi-${Math.random().toString(36).slice(2, 8)}@example.com`,
        phone: '+919876543210',
      },
    });

    return prisma.booking.create({
      data: {
        workspaceId: tenant.workspaceId,
        serviceId: tenant.serviceId,
        staffId: tenant.staffId,
        customerId: customer.id,
        startTime,
        endTime: new Date(startTime.getTime() + 30 * 60_000),
        status,
      },
    });
  }

  function makeWorkflow(overrides: Record<string, unknown> = {}) {
    return prisma.workflow.create({
      data: {
        workspaceId: tenant.workspaceId,
        name: `Reminder ${Math.random().toString(36).slice(2, 8)}`,
        trigger: 'BEFORE_APPOINTMENT',
        channel: 'EMAIL',
        recipient: 'CUSTOMER',
        offsetMinutes: -1440,
        isActive: true,
        ...overrides,
      },
    });
  }

  /** A booking 24 hours out is exactly due for a -1440 reminder now. */
  function dueIn24Hours(): Date {
    return new Date(Date.now() + 24 * 60 * 60 * 1000 - 60_000);
  }

  it('claims a due reminder and records the attempt', async () => {
    await makeWorkflow();
    const booking = await makeBooking(dueIn24Hours());

    const summary = await runScheduledWorkflows();

    expect(summary.bookingsDue).toBe(1);
    expect(summary.attempted).toBe(1);

    const logs = await prisma.notificationLog.findMany({ where: { bookingId: booking.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0].recipient).toContain('@');
  });

  it('never sends the same reminder twice however often it sweeps', async () => {
    await makeWorkflow();
    const booking = await makeBooking(dueIn24Hours());

    await runScheduledWorkflows();
    const second = await runScheduledWorkflows();
    await runScheduledWorkflows();

    expect(second.attempted).toBe(0);
    const logs = await prisma.notificationLog.count({ where: { bookingId: booking.id } });
    expect(logs).toBe(1);
  });

  it('sends only once when sweeps overlap', async () => {
    // Two workers running at the same moment race for the same claim; the
    // unique index is what stops both of them sending.
    await makeWorkflow();
    await makeBooking(dueIn24Hours());

    const results = await Promise.all([
      runScheduledWorkflows(),
      runScheduledWorkflows(),
      runScheduledWorkflows(),
    ]);

    const attempted = results.reduce((total, r) => total + r.attempted, 0);
    expect(attempted).toBe(1);
    expect(await prisma.notificationLog.count()).toBe(1);
  });

  it('ignores a booking that is not due yet', async () => {
    await makeWorkflow();
    // Three days out: the 24-hour reminder is not due for another two days.
    await makeBooking(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));

    const summary = await runScheduledWorkflows();
    expect(summary.bookingsDue).toBe(0);
    expect(await prisma.notificationLog.count()).toBe(0);
  });

  it('ignores a reminder older than the catch-up window', async () => {
    // After an outage the worker must not deliver a flood of reminders for
    // appointments that have already happened.
    await makeWorkflow();
    await makeBooking(new Date(Date.now() + 24 * 60 * 60 * 1000 - 6 * 60 * 60 * 1000));

    const summary = await runScheduledWorkflows({ catchUpMinutes: 60 });
    expect(summary.bookingsDue).toBe(0);
    expect(await prisma.notificationLog.count()).toBe(0);
  });

  it('does not remind about a cancelled appointment', async () => {
    await makeWorkflow();
    await makeBooking(dueIn24Hours(), 'CANCELLED');

    const summary = await runScheduledWorkflows();
    expect(summary.bookingsDue).toBe(0);
  });

  it('ignores an inactive workflow', async () => {
    await makeWorkflow({ isActive: false });
    await makeBooking(dueIn24Hours());

    const summary = await runScheduledWorkflows();
    expect(summary.workflowsConsidered).toBe(0);
    expect(await prisma.notificationLog.count()).toBe(0);
  });

  it('ignores a lifecycle workflow, which fires on the event instead', async () => {
    await makeWorkflow({ trigger: 'BOOKING_CREATED', offsetMinutes: 0 });
    await makeBooking(dueIn24Hours());

    const summary = await runScheduledWorkflows();
    expect(summary.workflowsConsidered).toBe(0);
  });

  it('handles a follow-up after the appointment', async () => {
    await makeWorkflow({ trigger: 'AFTER_APPOINTMENT', offsetMinutes: 120 });
    // Started three hours ago, so a two-hour follow-up is due.
    const booking = await makeBooking(new Date(Date.now() - 3 * 60 * 60 * 1000));

    const summary = await runScheduledWorkflows();
    expect(summary.bookingsDue).toBe(1);
    expect(await prisma.notificationLog.count({ where: { bookingId: booking.id } })).toBe(1);
  });

  it('never touches another tenant bookings', async () => {
    const other = await createTenant('other-reminder');
    await makeWorkflow();

    const otherCustomer = await prisma.customer.create({
      data: { workspaceId: other.workspaceId, name: 'Other', email: 'other@example.com' },
    });
    await prisma.booking.create({
      data: {
        workspaceId: other.workspaceId,
        serviceId: other.serviceId,
        staffId: other.staffId,
        customerId: otherCustomer.id,
        startTime: dueIn24Hours(),
        endTime: new Date(dueIn24Hours().getTime() + 30 * 60_000),
        status: 'CONFIRMED',
      },
    });

    const summary = await runScheduledWorkflows();
    expect(summary.bookingsDue).toBe(0);
    expect(await prisma.notificationLog.count()).toBe(0);
  });

  it('sends both recipients for a BOTH workflow, once each', async () => {
    await makeWorkflow({ recipient: 'BOTH' });
    const booking = await makeBooking(dueIn24Hours());

    await runScheduledWorkflows();
    await runScheduledWorkflows();

    const logs = await prisma.notificationLog.findMany({ where: { bookingId: booking.id } });
    expect(logs).toHaveLength(2);
    expect(new Set(logs.map((l) => l.recipient)).size).toBe(2);
  });

  it('records a failure rather than losing the attempt', async () => {
    // SMTP is not configured in the test environment, so delivery fails. The
    // point is that the attempt is still visible to an operator.
    await makeWorkflow();
    const booking = await makeBooking(dueIn24Hours());

    await runScheduledWorkflows();

    const log = await prisma.notificationLog.findFirstOrThrow({
      where: { bookingId: booking.id },
    });
    expect(log.status).toBe('FAILED');
    expect(log.error).toBeTruthy();
    expect(log.attempts).toBe(1);
  });

  it('stamps the workflow with its last run', async () => {
    const workflow = await makeWorkflow();
    await makeBooking(dueIn24Hours());

    await runScheduledWorkflows();

    const updated = await prisma.workflow.findUniqueOrThrow({ where: { id: workflow.id } });
    expect(updated.lastRunAt).not.toBeNull();
  });
});
