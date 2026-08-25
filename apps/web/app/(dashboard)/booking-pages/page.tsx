import * as React from 'react';
import Link from 'next/link';
import { prisma } from '@zoho-bookings/database';
import { Globe, ExternalLink, Copy, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button } from '@zoho-bookings/ui';

export const dynamic = 'force-dynamic';

export default async function BookingPagesPage() {
  const workspace = await prisma.workspace.findFirst({
    where: { slug: 'acme-consulting' },
    include: {
      bookingPages: true,
      services: { where: { isActive: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Public Booking Portals
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Shareable booking pages for your clients and website embed links.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Main Workspace Portal Card */}
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-blue-500/20">
                  <Globe className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Main Business Booking Portal
                  </CardTitle>
                  <span className="text-xs text-slate-500">
                    Displays all active services for {workspace?.name}
                  </span>
                </div>
              </div>

              <Badge variant="success">Published Live</Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="font-mono text-slate-700 dark:text-slate-300 font-bold truncate">
                http://localhost:3000/book/{workspace?.slug}
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/book/${workspace?.slug}`} target="_blank">
                  <Button size="sm" variant="primary" className="gap-1.5 text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open Live Booker
                  </Button>
                </Link>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">
                Direct Service Booking Links
              </span>
              <div className="space-y-2">
                {workspace?.services.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200 block">{s.name}</span>
                      <span className="text-[11px] font-mono text-slate-400">/book/{workspace.slug}/{s.slug}</span>
                    </div>

                    <Link href={`/book/${workspace.slug}/${s.slug}`} target="_blank">
                      <Button size="sm" variant="outline" className="text-xs gap-1">
                        Preview
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
