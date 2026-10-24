import type { FeatureModule } from '@bookings/core';

export const exportFeatureModule: FeatureModule = {
  id: 'export',
  name: 'Export Data',
  description: 'CSV and Excel data exports for compliance, backup, and reporting',
  category: 'operations',
  flag: 'dataExportEnabled',
  adminOnly: true,
  navItem: {
    label: 'Export Data',
    href: '/export',
    iconName: 'Download',
    order: 80,
  },
};
