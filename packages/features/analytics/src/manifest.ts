import type { FeatureModule } from '@bookings/core';

export const analyticsFeatureModule: FeatureModule = {
  id: 'analytics',
  name: 'Analytics & Reports',
  description: 'Revenue, completion rates, staff performance, and customer retention metrics',
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
