// Feature Manifest
export * from './manifest';

// Domain Types
export type {
  AnalyticsData,
  RevenueByMonth,
  RevenueByService,
  StaffPerformanceMetric,
  TopCustomerMetric,
} from './domain/types';

// Application Services
export * from './application/getWorkspaceAnalytics';

// UI Components
export { AnalyticsClient } from './components/AnalyticsClient';
