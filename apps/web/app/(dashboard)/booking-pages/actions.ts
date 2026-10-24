'use server';

/**
 * Re-export actions from @bookings/feature-booking-pages to preserve backward compatibility.
 */
export {
  updateBookingPageBrandingAction,
  saveRoutingFormAction,
  type BrandingInput,
  type BookingPageActionResult,
  type RoutingFormInput,
  type RoutingFormActionResult,
  brandingSchema,
  routingFormSchema,
} from '@bookings/feature-booking-pages';
