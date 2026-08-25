import * as React from 'react';
import { prisma } from '@zoho-bookings/database';
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Video,
  MapPin,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge } from '@zoho-bookings/ui';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function CalendarPage() {
  const workspace = await prisma.workspace.findFirst({
    where: { slug: 'acme-consulting' },
  });

  const bookings = workspace
    ? await prisma.booking.findMany({
        where: { workspaceId: workspace.id },
        include: {
          customer: true,
          service: true,
          staff: true,
        },
        orderBy: { startTime: 'asc' },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Bookings & Calendar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review all confirmed appointments, video meetings, and customer bookings.
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <CalendarIcon className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            No Bookings Yet
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
            When clients schedule appointments through your public booking portal, they will appear here in real-time.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Card key={b.id} className="border-slate-200 dark:border-slate-800 transition-all hover:border-blue-400">
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    <CalendarIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {b.service.name}
                      </span>
                      <Badge variant="success" className="text-[10px] uppercase">
                        {b.status}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        <span>{format(new Date(b.startTime), 'EEE, MMM d, yyyy • h:mm a')}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{b.customer.name} ({b.customer.email})</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="text-right hidden md:block">
                    <span className="text-xs text-slate-400 block">Advisor</span>
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {b.staff.name}
                    </span>
                  </div>

                  {b.meetingLink && b.meetingLink.startsWith('http') && (
                    <a
                      href={b.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100"
                    >
                      <Video className="h-3.5 w-3.5" />
                      Join Meeting
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
