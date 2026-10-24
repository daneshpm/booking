import { describe, it, expect, vi } from 'vitest';
import {
  InMemoryEventBus,
  BookingCreatedEvent,
  ModuleRegistry,
  type FeatureModule,
} from '../src';

describe('InMemoryEventBus', () => {
  it('should deliver events to subscribers and isolate listener errors', async () => {
    const bus = new InMemoryEventBus();
    const received: string[] = [];

    const failingHandler = vi.fn().mockImplementation(() => {
      throw new Error('Listener crash');
    });

    const successHandler = vi.fn().mockImplementation((evt) => {
      received.push(evt.payload.bookingId);
    });

    bus.subscribe('booking.created', failingHandler);
    bus.subscribe('booking.created', successHandler);

    const event = new BookingCreatedEvent('ws-1', {
      bookingId: 'bk-123',
      serviceId: 'srv-1',
      serviceName: 'Consultation',
      staffId: 'st-1',
      customerId: 'cust-1',
      customerName: 'Alice',
      customerEmail: 'alice@example.com',
      startTime: '2026-10-22T10:00:00.000Z',
      endTime: '2026-10-22T11:00:00.000Z',
      status: 'CONFIRMED',
    });

    await bus.publish(event);

    expect(failingHandler).toHaveBeenCalledTimes(1);
    expect(successHandler).toHaveBeenCalledTimes(1);
    expect(received).toEqual(['bk-123']);
  });

  it('supports wildcard subscriptions', async () => {
    const bus = new InMemoryEventBus();
    const wildEvents: string[] = [];

    bus.subscribe('*', (evt) => {
      wildEvents.push(evt.name);
    });

    await bus.publish({
      name: 'custom.event',
      occurredAt: new Date().toISOString(),
      workspaceId: 'ws-1',
      payload: {},
    });

    expect(wildEvents).toEqual(['custom.event']);
  });
});

describe('ModuleRegistry', () => {
  it('should register and filter navigation items by feature flag and user role', () => {
    const registry = new ModuleRegistry();

    const workflowsModule: FeatureModule = {
      id: 'workflows',
      name: 'Workflows',
      description: 'Automations',
      category: 'automation',
      flag: 'workflowsEnabled',
      navItem: {
        label: 'Workflows',
        href: '/workflows',
        iconName: 'Activity',
        order: 40,
      },
    };

    const analyticsModule: FeatureModule = {
      id: 'analytics',
      name: 'Analytics',
      description: 'Reports',
      category: 'operations',
      flag: 'analyticsEnabled',
      adminOnly: true,
      navItem: {
        label: 'Analytics',
        href: '/analytics',
        iconName: 'BarChart3',
        order: 70,
      },
    };

    const coreAppointments: FeatureModule = {
      id: 'appointments',
      name: 'Appointments',
      description: 'Calendar and appointments',
      category: 'core',
      navItem: {
        label: 'Appointments',
        href: '/appointments',
        iconName: 'CalendarCheck',
        order: 10,
      },
    };

    registry.register(workflowsModule);
    registry.register(analyticsModule);
    registry.register(coreAppointments);

    // Case 1: Regular staff with workflows disabled
    const staffNav = registry.getVisibleNavItems('STAFF', { workflowsEnabled: false, analyticsEnabled: true });
    expect(staffNav.map((n) => n.id)).toEqual(['appointments']);

    // Case 2: Admin with workflows enabled and analytics enabled
    const adminNav = registry.getVisibleNavItems('ADMIN', { workflowsEnabled: true, analyticsEnabled: true });
    expect(adminNav.map((n) => n.id)).toEqual(['appointments', 'workflows', 'analytics']);
  });
});
