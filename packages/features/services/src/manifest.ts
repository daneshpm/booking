import type { FeatureModule } from '@bookings/core';

export const servicesFeatureModule: FeatureModule = {
  id: 'services',
  name: 'Event Types',
  description: 'Configure bookable 1-on-1 and group services, pricing, durations, and buffer times',
  category: 'core',
  navItem: {
    label: 'Event Types',
    href: '/event-types',
    iconName: 'Tag',
    order: 20,
  },
};
