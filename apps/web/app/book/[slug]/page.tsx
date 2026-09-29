import * as React from 'react';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@bookings/database';
import {
  Clock,
  DollarSign,
  MapPin,
  Video,
  Building,
  Phone,
  ArrowRight,
  Calendar,
  Globe,
} from 'lucide-react';
import { Button, Badge } from '@bookings/ui';

export const dynamic = 'force-dynamic';

interface BookingPortalPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ viewAll?: string }>;
}

export default async function BookingPortalPage({ params, searchParams }: BookingPortalPageProps) {
  const { slug } = await params;
  const { viewAll } = await searchParams;

  // 1. A workspace slug resolves only when that workspace has a published
  //    booking page. Without this check, un-publishing a page changed nothing
  //    and the whole service catalogue stayed publicly readable.
  let workspace = await prisma.workspace.findFirst({
    where: {
      slug,
      isActive: true,
      OR: [{ bookingPages: { some: { isPublished: true } } }, { bookingPages: { none: {} } }],
    },
    include: {
      services: {
        where: { isActive: true },
        include: { category: true },
        orderBy: { createdAt: 'asc' },
      },
      // A service, staff assignment, or the routing form option pointing at
      // it can each be deleted independently, so an option can end up with
      // no active service behind it; those are simply left out rather than
      // routing a customer to a page that no longer exists.
      routingForm: {
        include: {
          options: {
            where: { service: { isActive: true } },
            include: { service: { select: { slug: true } } },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
    },
  });

  // 2. If not found by workspace slug, check for a published booking page.
  //    Unpublished pages stay unreachable.
  if (!workspace) {
    const bookingPage = await prisma.bookingPage.findFirst({
      where: { slug, isPublished: true },
      include: {
        workspace: {
          include: {
            services: {
              where: { isActive: true },
              include: { category: true },
              orderBy: { createdAt: 'asc' },
            },
            routingForm: {
              include: {
                options: {
                  where: { service: { isActive: true } },
                  include: { service: { select: { slug: true } } },
                  orderBy: { sortOrder: 'asc' },
                },
              },
            },
          },
        },
      },
    });

    if (bookingPage?.workspace) {
      workspace = bookingPage.workspace;
    }
  }

  if (!workspace) {
    // If slug matches a bookable service, redirect to /book/[workspaceSlug]/[serviceSlug]
    const matchingService = await prisma.service.findFirst({
      where: { slug, isActive: true },
      include: { workspace: { select: { slug: true } } },
    });

    if (matchingService?.workspace?.slug) {
      redirect(`/book/${matchingService.workspace.slug}/${matchingService.slug}`);
    }

    return notFound();
  }

  const formatLocationLabel = (type: string) => {
    switch (type) {
      case 'ONLINE_MEETING':
        return 'Online Video';
      case 'IN_PERSON_BUSINESS':
        return 'In Office';
      case 'PHONE_CALL':
        return 'Phone Call';
      default:
        return 'In Person';
    }
  };

  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'ONLINE_MEETING':
        return <Video className="h-3.5 w-3.5 text-purple-600" />;
      case 'IN_PERSON_BUSINESS':
        return <Building className="h-3.5 w-3.5 text-indigo-600" />;
      case 'PHONE_CALL':
        return <Phone className="h-3.5 w-3.5 text-emerald-600" />;
      default:
        return <MapPin className="h-3.5 w-3.5 text-amber-600" />;
    }
  };

  // Matches Tailwind's indigo-600, so an un-branded workspace renders exactly
  // as it did before this was configurable.
  const brandColor = workspace.brandColor || '#4f46e5';
  const welcomeTitle = workspace.bookingWelcomeTitle || 'Schedule an Appointment';
  const welcomeMessage =
    workspace.bookingWelcomeMessage ||
    'Choose an appointment type below to view open dates and instant time slots.';

  const routingOptions = (workspace.routingForm?.options || []).filter((o) => o.service);
  const showRouting =
    Boolean(workspace.routingForm?.isEnabled) && routingOptions.length > 0 && viewAll !== '1';

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-white font-black shadow-md"
            style={{ backgroundColor: brandColor }}
          >
            {workspace.name.charAt(0)}
          </div>
          <div>
            <span className="text-base font-black tracking-tight text-slate-900 block">
              {workspace.name}
            </span>
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
              <Globe className="h-3 w-3 text-indigo-600" />
              {workspace.timezone}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 w-full space-y-10">
        {/* Intro */}
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-xs font-semibold"
            style={{ color: brandColor }}
          >
            <Calendar className="h-3.5 w-3.5" style={{ color: brandColor }} />
            <span>{showRouting ? 'Quick Question' : 'Select an Appointment Type'}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            {welcomeTitle}
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">{welcomeMessage}</p>
        </div>

        {/* Routing Form: one question that sends the customer straight to a
            matching service instead of the full catalogue. */}
        {showRouting ? (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3">
              <h2 className="text-base font-bold text-slate-900 text-center">
                {workspace.routingForm!.question}
              </h2>
              <div className="space-y-2.5">
                {routingOptions.map((option) => (
                  <Link
                    key={option.id}
                    href={`/book/${workspace.slug}/${option.service!.slug}`}
                    className="flex items-center justify-between gap-2 p-3.5 rounded-2xl border border-slate-200 hover:border-[var(--brand)] hover:shadow-md transition-all text-sm font-semibold text-slate-800 group"
                    style={{ '--brand': brandColor } as React.CSSProperties}
                  >
                    {option.label}
                    <ArrowRight
                      className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform"
                      style={{ color: brandColor }}
                    />
                  </Link>
                ))}
              </div>
            </div>
            <div className="text-center">
              <Link
                href={`/book/${workspace.slug}?viewAll=1`}
                className="text-xs text-slate-500 hover:text-slate-800 font-medium underline"
              >
                View all services instead
              </Link>
            </div>
          </div>
        ) : workspace.services.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white shadow-sm max-w-md mx-auto">
            <Calendar className="h-8 w-8 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900">No active services</h3>
            <p className="text-xs text-slate-500 mt-1">
              There are currently no public services available for booking.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {workspace.services.map((service) => (
              <div
                key={service.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md hover:shadow-indigo-500/5"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {service.name}
                      </h3>
                      {service.category && (
                        <span className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider block mt-0.5">
                          {service.category.name}
                        </span>
                      )}
                    </div>
                    <Badge
                      variant="info"
                      className="text-xs font-bold bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      {Number(service.price) > 0 ? `$${Number(service.price).toFixed(2)}` : 'Free'}
                    </Badge>
                  </div>

                  {service.description && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {service.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                      <Clock className="h-3.5 w-3.5 text-indigo-600" />
                      <span>{service.durationMinutes} mins</span>
                    </div>

                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-700">
                      {getLocationIcon(service.locationType)}
                      <span>{formatLocationLabel(service.locationType)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Instant confirmation</span>
                  <Link href={`/book/${workspace.slug}/${service.slug}`}>
                    <Button
                      variant="primary"
                      className="gap-2 text-xs text-white shadow-md hover:brightness-90 px-4 py-2 rounded-xl transition-all"
                      style={{ backgroundColor: brandColor }}
                    >
                      Book Now
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-6 text-center text-xs text-slate-500">
        Powered by Rooman Bookings | Rooman Technologies
      </footer>
    </div>
  );
}
