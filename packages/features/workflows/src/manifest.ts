import type { FeatureModule, IEventBus, DomainEvent } from '@bookings/core';
import { dispatchBookingNotifications } from '@bookings/notifications';

export const workflowsFeatureModule: FeatureModule = {
  id: 'workflows',
  name: 'Automated Workflows',
  description: 'Email, SMS, and webhook automations triggered on booking events',
  category: 'automation',
  flag: 'workflowsEnabled',
  navItem: {
    label: 'Workflows',
    href: '/workflows',
    iconName: 'Activity',
    order: 40,
  },
  onRegister: (eventBus: IEventBus) => {
    // Plug-and-play event subscriptions:
    // When a booking lifecycle event occurs anywhere in the system,
    // the workflows module automatically handles dispatching notifications.
    eventBus.subscribe('booking.created', async (event: DomainEvent<any>) => {
      try {
        const bookingId = event.payload?.bookingId;
        if (bookingId) {
          await dispatchBookingNotifications(bookingId, 'BOOKING_CREATED');
        }
      } catch (err) {
        console.error('[WorkflowsModule] Failed to dispatch BOOKING_CREATED notifications:', err);
      }
    });

    eventBus.subscribe('booking.cancelled', async (event: DomainEvent<any>) => {
      try {
        const bookingId = event.payload?.bookingId;
        if (bookingId) {
          await dispatchBookingNotifications(bookingId, 'BOOKING_CANCELLED');
        }
      } catch (err) {
        console.error('[WorkflowsModule] Failed to dispatch BOOKING_CANCELLED notifications:', err);
      }
    });

    eventBus.subscribe('booking.rescheduled', async (event: DomainEvent<any>) => {
      try {
        const bookingId = event.payload?.bookingId;
        if (bookingId) {
          await dispatchBookingNotifications(bookingId, 'BOOKING_RESCHEDULED');
        }
      } catch (err) {
        console.error('[WorkflowsModule] Failed to dispatch BOOKING_RESCHEDULED notifications:', err);
      }
    });
  },
};
