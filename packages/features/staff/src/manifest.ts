import type { FeatureModule } from '@bookings/core';

export const staffFeatureModule: FeatureModule = {
  id: 'staff',
  name: 'Team & Staff',
  description: 'Manage staff members, roles, permissions, working hours, and service assignments',
  category: 'core',
  navItem: {
    label: 'Users',
    href: '/users',
    iconName: 'Users',
    order: 50,
  },
};
