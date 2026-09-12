'use client';

import * as React from 'react';
import { TrendingUp, Users, Repeat, UserPlus } from 'lucide-react';

export interface AnalyticsData {
  currency: string;
  revenue: {
    total: number;
    last30Days: number;
    byMonth: { month: string; amount: number }[];
    byService: { name: string; amount: number }[];
  };
  staff: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    completed: number;
    cancelled: number;
    noShow: number;
    revenue: number;
    completionRate: number | null;
  }[];
  customers: {
    total: number;
    newThisMonth: number;
    repeatRate: number;
    topCustomers: { id: string; name: string; email: string; bookings: number; revenue: number }[];
  };
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || '?'
  );
}

export function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const { currency } = data;
  const maxMonthAmount = Math.max(1, ...data.revenue.byMonth.map((m) => m.amount));
  const maxServiceAmount = Math.max(1, ...data.revenue.byService.map((s) => s.amount));

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800">Analytics</h1>
        <p className="text-xs text-slate-500 mt-1">
          Revenue, staff performance, and customer insights for your workspace.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={TrendingUp}
          label="Total revenue"
          value={formatMoney(data.revenue.total, currency)}
        />
        <SummaryCard
          icon={TrendingUp}
          label="Revenue (last 30 days)"
          value={formatMoney(data.revenue.last30Days, currency)}
        />
        <SummaryCard icon={Users} label="Total customers" value={String(data.customers.total)} />
        <SummaryCard
          icon={UserPlus}
          label="New customers this month"
          value={String(data.customers.newThisMonth)}
        />
      </div>

      {/* Revenue by month */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Revenue — last 6 months</h2>
        {data.revenue.byMonth.every((m) => m.amount === 0) ? (
          <EmptyState text="No paid bookings in this period yet." />
        ) : (
          <div className="flex items-end gap-4 h-40">
            {data.revenue.byMonth.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center gap-2 h-full">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#5c34ad] to-[#7b4bd6]"
                    style={{ height: `${Math.max(4, (m.amount / maxMonthAmount) * 100)}%` }}
                    title={formatMoney(m.amount, currency)}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-500">{m.month}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by service */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Top services by revenue</h2>
          {data.revenue.byService.length === 0 ? (
            <EmptyState text="No paid bookings yet." />
          ) : (
            <div className="space-y-3">
              {data.revenue.byService.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-700 truncate">{s.name}</span>
                    <span className="text-slate-500 font-medium">
                      {formatMoney(s.amount, currency)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5c34ad]"
                      style={{ width: `${Math.max(4, (s.amount / maxServiceAmount) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer insights */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5">
          <h2 className="text-sm font-bold text-slate-800 mb-4">Customer insights</h2>
          <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-slate-600">
            <Repeat className="h-3.5 w-3.5 text-[#5c34ad]" />
            {data.customers.repeatRate}% of customers have booked more than once
          </div>
          {data.customers.topCustomers.length === 0 ? (
            <EmptyState text="No paid bookings yet." />
          ) : (
            <div className="space-y-2">
              {data.customers.topCustomers.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-700 truncate">{c.name}</div>
                    <div className="text-slate-400 truncate">{c.email}</div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="font-bold text-slate-800">
                      {formatMoney(c.revenue, currency)}
                    </div>
                    <div className="text-slate-400">
                      {c.bookings} booking{c.bookings === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff performance */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5">
        <h2 className="text-sm font-bold text-slate-800 mb-4">Staff performance</h2>
        {data.staff.length === 0 ? (
          <EmptyState text="No staff members yet." />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-xs min-w-[560px]">
              <thead>
                <tr className="text-left text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="px-5 py-2 font-bold">Staff</th>
                  <th className="px-3 py-2 font-bold">Completed</th>
                  <th className="px-3 py-2 font-bold">Cancelled</th>
                  <th className="px-3 py-2 font-bold">No-show</th>
                  <th className="px-3 py-2 font-bold">Completion rate</th>
                  <th className="px-3 py-2 font-bold text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.staff.map((s) => (
                  <tr key={s.id}>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-2">
                        {s.avatarUrl ? (
                          <img
                            src={s.avatarUrl}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-purple-100 text-[#5c34ad] font-bold flex items-center justify-center text-[10px] shrink-0">
                            {initials(s.name)}
                          </div>
                        )}
                        <span className="font-semibold text-slate-700">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-slate-600">{s.completed}</td>
                    <td className="px-3 py-2.5 text-slate-600">{s.cancelled}</td>
                    <td className="px-3 py-2.5 text-slate-600">{s.noShow}</td>
                    <td className="px-3 py-2.5 text-slate-600">
                      {s.completionRate === null ? '—' : `${s.completionRate}%`}
                    </td>
                    <td className="px-3 py-2.5 text-right font-bold text-slate-800">
                      {formatMoney(s.revenue, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-4">
      <div className="flex items-center gap-2 text-slate-400 mb-2">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-lg font-black text-slate-800">{value}</div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="text-xs text-slate-400 py-6 text-center">{text}</p>;
}
