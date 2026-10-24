'use server';

/**
 * Re-export export actions from @bookings/feature-export to preserve backward compatibility.
 * Core data export business logic and schemas live in the modular @bookings/feature-export package.
 */
export {
  exportAppointmentsAction,
  exportSchema,
  type ExportInput,
  type ExportResult,
} from '@bookings/feature-export';
