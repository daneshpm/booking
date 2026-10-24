import type { FeatureModule } from '@bookings/core';

export const bookingPagesFeatureModule: FeatureModule = {
  id: 'booking-pages',
  name: 'Booking Pages',
  description: 'Public self-service booking links, welcome branding, themes, and routing forms',
  category: 'marketing',
  flag: 'bookingPagesEnabled',
  navItem: {
    label: 'Booking Pages',
    href: '/booking-pages',
    iconName: 'Layers',
    order: 60,
  },
};
