import * as React from 'react';
import { prisma } from '@bookings/database';
import { requireWorkspace } from '@/lib/session';
import { AnalyticsClient, type AnalyticsData } from './AnalyticsClient';

export const dynamic = 'force-dynamic';

function toNumber(value: unknown): number {
  return value ? Number(value) : 0;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

export default async function AnalyticsPage() {
  const { workspace } = await requireWorkspace(null, 'ADMIN');

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    staffList,
    staffStatusCounts,
    staffRevenue,
    serviceRevenue,
    monthlyBookings,
    totalRevenueAgg,
    last30DaysRevenueAgg,
    customerBookingCounts,
    totalCustomers,
    newCustomersThisMonth,
    topCustomerRevenue,
  ] = await Promise.all([
    prisma.staff.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, avatarUrl: true },
      orderBy: { name: 'asc' },
    }),
    prisma.booking.groupBy({
      by: ['staffId', 'status'],
      where: { workspaceId: workspace.id },
      _count: true,
    }),
    prisma.booking.groupBy({
      by: ['staffId'],
      where: { workspaceId: workspace.id, paymentStatus: 'PAID' },
      _sum: { paidPrice: true },
    }),
    prisma.booking.groupBy({
      by: ['serviceId'],
      where: {
        workspaceId: workspace.id,
        paymentStatus: 'PAID',
        startTime: { gte: twelveMonthsAgo },
      },
      _sum: { paidPrice: true },
      orderBy: { _sum: { paidPrice: 'desc' } },
      take: 5,
    }),
    prisma.booking.findMany({
      where: {
        workspaceId: workspace.id,
        paymentStatus: 'PAID',
        startTime: { gte: sixMonthsAgo },
      },
      select: { startTime: true, paidPrice: true },
    }),
    prisma.booking.aggregate({
      where: { workspaceId: workspace.id, paymentStatus: 'PAID' },
      _sum: { paidPrice: true },
    }),
    prisma.booking.aggregate({
      where: {
        workspaceId: workspace.id,
        paymentStatus: 'PAID',
        startTime: { gte: thirtyDaysAgo },
      },
      _sum: { paidPrice: true },
    }),
    prisma.booking.groupBy({
      by: ['customerId'],
      where: { workspaceId: workspace.id },
      _count: true,
    }),
    prisma.customer.count({ where: { workspaceId: workspace.id } }),
    prisma.customer.count({
      where: { workspaceId: workspace.id, createdAt: { gte: startOfThisMonth } },
    }),
    prisma.booking.groupBy({
      by: ['customerId'],
      where: { workspaceId: workspace.id, paymentStatus: 'PAID' },
      _sum: { paidPrice: true },
      _count: true,
      orderBy: { _sum: { paidPrice: 'desc' } },
      take: 5,
    }),
  ]);

  const serviceIds = serviceRevenue.map((r) => r.serviceId);
  const topCustomerIds = topCustomerRevenue.map((r) => r.customerId);

  const [services, topCustomers] = await Promise.all([
    prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true },
    }),
    prisma.customer.findMany({
      where: { id: { in: topCustomerIds } },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const serviceNameById = new Map(services.map((s) => [s.id, s.name]));
  const customerById = new Map(topCustomers.map((c) => [c.id, c]));

  // --- Revenue by month (last 6 months, zero-filled) ---
  const monthBuckets = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    monthBuckets.set(monthKey(d), 0);
  }
  for (const booking of monthlyBookings) {
    const key = monthKey(new Date(booking.startTime));
    if (monthBuckets.has(key)) {
      monthBuckets.set(key, (monthBuckets.get(key) || 0) + toNumber(booking.paidPrice));
    }
  }
  const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { month: monthLabel(d), amount: monthBuckets.get(monthKey(d)) || 0 };
  });

  // --- Revenue by service (top 5) ---
  const revenueByService = serviceRevenue
    .filter((r) => toNumber(r._sum.paidPrice) > 0)
    .map((r) => ({
      name: serviceNameById.get(r.serviceId) || 'Unknown service',
      amount: toNumber(r._sum.paidPrice),
    }));

  // --- Staff performance ---
  type StaffTally = { completed: number; cancelled: number; noShow: number };
  const staffTallies = new Map<string, StaffTally>();
  for (const row of staffStatusCounts) {
    const tally = staffTallies.get(row.staffId) || { completed: 0, cancelled: 0, noShow: 0 };
    if (row.status === 'COMPLETED') tally.completed += row._count;
    if (row.status === 'CANCELLED') tally.cancelled += row._count;
    if (row.status === 'NO_SHOW') tally.noShow += row._count;
    staffTallies.set(row.staffId, tally);
  }
  const staffRevenueById = new Map(
    staffRevenue.map((r) => [r.staffId, toNumber(r._sum.paidPrice)])
  );
  const staffPerformance = staffList
    .map((s) => {
      const tally = staffTallies.get(s.id) || { completed: 0, cancelled: 0, noShow: 0 };
      const concluded = tally.completed + tally.cancelled + tally.noShow;
      return {
        id: s.id,
        name: s.name,
        avatarUrl: s.avatarUrl,
        completed: tally.completed,
        cancelled: tally.cancelled,
        noShow: tally.noShow,
        revenue: staffRevenueById.get(s.id) || 0,
        completionRate: concluded > 0 ? Math.round((tally.completed / concluded) * 100) : null,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // --- Customer insights ---
  const customersWithBookings = customerBookingCounts.length;
  const repeatCustomers = customerBookingCounts.filter((c) => c._count > 1).length;
  const repeatRate =
    customersWithBookings > 0 ? Math.round((repeatCustomers / customersWithBookings) * 100) : 0;

  const topCustomerList = topCustomerRevenue
    .filter((r) => toNumber(r._sum.paidPrice) > 0)
    .map((r) => {
      const customer = customerById.get(r.customerId);
      return {
        id: r.customerId,
        name: customer?.name || 'Unknown customer',
        email: customer?.email || '',
        bookings: r._count,
        revenue: toNumber(r._sum.paidPrice),
      };
    });

  const data: AnalyticsData = {
    currency: workspace.currency,
    revenue: {
      total: toNumber(totalRevenueAgg._sum.paidPrice),
      last30Days: toNumber(last30DaysRevenueAgg._sum.paidPrice),
      byMonth: revenueByMonth,
      byService: revenueByService,
    },
    staff: staffPerformance,
    customers: {
      total: totalCustomers,
      newThisMonth: newCustomersThisMonth,
      repeatRate,
      topCustomers: topCustomerList,
    },
  };

  return <AnalyticsClient data={data} />;
}
