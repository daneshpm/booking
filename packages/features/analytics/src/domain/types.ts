export interface RevenueByMonth {
  month: string;
  amount: number;
}

export interface RevenueByService {
  name: string;
  amount: number;
}

export interface StaffPerformanceMetric {
  id: string;
  name: string;
  avatarUrl?: string | null;
  completed: number;
  cancelled: number;
  noShow: number;
  revenue: number;
  completionRate: number | null;
}

export interface TopCustomerMetric {
  id: string;
  name: string;
  email: string;
  bookings: number;
  revenue: number;
}

export interface AnalyticsData {
  currency: string;
  revenue: {
    total: number;
    last30Days: number;
    byMonth: RevenueByMonth[];
    byService: RevenueByService[];
  };
  staff: StaffPerformanceMetric[];
  customers: {
    total: number;
    newThisMonth: number;
    repeatRate: number;
    topCustomers: TopCustomerMetric[];
  };
}
