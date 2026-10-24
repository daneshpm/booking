import {
  ModuleRegistry,
  defaultEventBus,
  type FeatureModule,
} from '@bookings/core';
import { servicesFeatureModule } from '@bookings/feature-services';
import { workflowsFeatureModule } from '@bookings/feature-workflows';
import { appointmentsFeatureModule } from '@bookings/feature-appointments';
import { analyticsFeatureModule } from '@bookings/feature-analytics';
import { bookingPagesFeatureModule } from '@bookings/feature-booking-pages';
import { customersFeatureModule } from '@bookings/feature-customers';
import { exportFeatureModule } from '@bookings/feature-export';
import { staffFeatureModule } from '@bookings/feature-staff';
import {
  CalendarCheck,
  Tag,
  Clock,
  Activity,
  Users,
  Layers,
  BarChart3,
  Download,
  type LucideIcon,
} from 'lucide-react';

/** Map of iconic string names to LucideIcon components for dynamic rendering */
export const MODULE_ICON_MAP: Record<string, LucideIcon> = {
  CalendarCheck,
  Tag,
  Clock,
  Activity,
  Users,
  Layers,
  BarChart3,
  Download,
};

/** Central Module Registry instance for the Web Application */
export const webModuleRegistry = new ModuleRegistry();

// 1. Appointments (Core - Modular Feature Package)
webModuleRegistry.register(appointmentsFeatureModule);

// 2. Services / Event Types (Core - Modular Feature Package)
webModuleRegistry.register(servicesFeatureModule);

// 3. Schedules & Availability (Core)
webModuleRegistry.register({
  id: 'schedules',
  name: 'Schedules',
  description: 'Operating hours, shifts, date overrides, and buffer times',
  category: 'core',
  navItem: {
    label: 'Schedules',
    href: '/schedules',
    iconName: 'Clock',
    order: 30,
  },
});

// 4. Workflows (Automation - Modular Feature Package)
webModuleRegistry.register(workflowsFeatureModule, defaultEventBus);

// 5. Customers (Core - Modular Feature Package)
webModuleRegistry.register(customersFeatureModule);

// 5. Users / Staff (Core - Modular Feature Package)
webModuleRegistry.register(staffFeatureModule);

// 6. Booking Pages (Marketing - Modular Feature Package)
webModuleRegistry.register(bookingPagesFeatureModule);

// 7. Analytics (Operations - Modular Feature Package)
webModuleRegistry.register(analyticsFeatureModule);

// 8. Export Data (Operations - Modular Feature Package)
webModuleRegistry.register(exportFeatureModule);
