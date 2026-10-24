'use client';

/**
 * Re-export AnalyticsClient and types from @bookings/feature-analytics.
 * The presentation and analytics domain now live in the modular @bookings/feature-analytics package.
 */
export {
  AnalyticsClient,
  type AnalyticsData,
  type RevenueByMonth,
  type RevenueByService,
  type StaffPerformanceMetric,
  type TopCustomerMetric,
} from '@bookings/feature-analytics';
