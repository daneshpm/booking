'use client';

/**
 * Re-export WorkflowsClient from @bookings/feature-workflows.
 * The full client UI now lives in the modular @bookings/feature-workflows package.
 */
export {
  WorkflowsClient,
  type WorkflowItem,
  type DeliveryItem,
  type ServiceSummary,
} from '@bookings/feature-workflows';
