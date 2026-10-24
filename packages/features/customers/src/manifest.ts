import type { FeatureModule } from '@bookings/core';

export const customersFeatureModule: FeatureModule = {
  id: 'customers',
  name: 'Customers',
  description: 'Customer directory, booking history, contact profiles, and notes',
  category: 'core',
  navItem: {
    label: 'Customers',
    href: '/customers',
    iconName: 'Users',
    order: 35,
  },
};
