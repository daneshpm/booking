'use server';

/**
 * Re-export actions from @bookings/feature-staff to preserve backward compatibility.
 */
export {
  createStaffAction,
  updateStaffAction,
  toggleStaffStatusAction,
  deleteStaffAction,
  updateStaffWorkingHoursAction,
  type DayScheduleInput,
  type StaffActionResult,
} from '@bookings/feature-staff';
