import type { FeatureModule } from '@bookings/core';

export const appointmentsFeatureModule: FeatureModule = {
  id: 'appointments',
  name: 'Appointments',
  description: 'Manage bookings, appointments, status lifecycles, and waitlist queues',
  category: 'core',
  navItem: {
    label: 'Appointments',
    href: '/appointments',
    iconName: 'CalendarCheck',
    order: 10,
  },
};
