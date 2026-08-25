import * as React from 'react';
import { prisma } from '@zoho-bookings/database';
import { UserCheck, Mail, Phone, Calendar, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@zoho-bookings/ui';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const workspace = await prisma.workspace.findFirst({
    where: { slug: 'acme-consulting' },
  });

  const customers = workspace
    ? await prisma.customer.findMany({
        where: { workspaceId: workspace.id },
        include: {
          bookings: {
            orderBy: { startTime: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Customers Directory
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          View client contact details, lifetime appointments booked, and meeting history.
        </p>
      </div>

      {customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <UserCheck className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Customers Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            As clients book appointments, customer profiles will automatically be generated and saved here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((c) => (
            <Card key={c.id} className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {c.name}
                      </CardTitle>
                      <span className="text-[11px] text-slate-400 block">
                        Customer since {format(new Date(c.createdAt), 'MMM yyyy')}
                      </span>
                    </div>
                  </div>

                  <Badge variant="info" className="text-[10px]">
                    {c.bookings.length} {c.bookings.length === 1 ? 'Booking' : 'Bookings'}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-2 text-xs pt-1">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>

                {c.phone && (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                    <Phone className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <span>{c.phone}</span>
                  </div>
                )}

                {c.notes && (
                  <div className="mt-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-500 text-[11px] italic">
                    "{c.notes}"
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
