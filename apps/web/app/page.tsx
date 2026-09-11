import { prisma } from '@bookings/database';
import { ApexLandingPage, LandingService, LandingStaff } from './components/ApexLandingPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rooman Bookings | Rooman Technologies Appointment & Skilling Platform',
  description:
    'Official consultation and skilling scheduling platform for Rooman Technologies. Book 1-on-1 IT career counseling, enterprise workforce upskilling, and University Center of Excellence sessions.',
};

export default async function HomePage() {
  const envSlug = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_SLUG?.trim();
  let defaultSlug = envSlug || 'rooman-technologies';

  // Staff pull the OWNER-role memberships of their linked user account (not
  // scoped to this workspace at the DB level, since that would need to
  // reference the outer workspace id from inside its own nested include) so
  // we can tell whether a given staff row IS this workspace's owner further
  // down, rather than guessing from their display name.
  const staffInclude = {
    where: { isActive: true },
    orderBy: { createdAt: 'asc' as const },
    include: {
      user: {
        select: {
          memberships: {
            where: { role: 'OWNER' as const },
            select: { workspaceId: true },
          },
        },
      },
    },
  };

  let workspace = await prisma.workspace.findFirst({
    where: { slug: defaultSlug },
    include: {
      services: {
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      },
      staff: staffInclude,
    },
  });

  if (!workspace) {
    const published = await prisma.bookingPage.findFirst({
      where: { isPublished: true },
      include: {
        workspace: {
          include: {
            services: {
              where: { isActive: true },
              orderBy: { createdAt: 'asc' },
            },
            staff: staffInclude,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    if (published?.workspace) {
      workspace = published.workspace;
      defaultSlug = workspace.slug;
    }
  }

  // Deliberately no further fallback: falling back to "any workspace" here would
  // publicly render an arbitrary, unrelated tenant's services, staff and pricing
  // on the marketing homepage whenever the configured default slug is missing or
  // wrong. Better to show the page with no services/staff than leak one.

  // Serialize Prisma models so Decimal and Date types are safe for Client Component boundary
  const services: LandingService[] = (workspace?.services || []).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    description: s.description,
    durationMinutes: s.durationMinutes,
    price: Number(s.price),
    currency: s.currency,
    locationType: s.locationType,
  }));

  const staff: LandingStaff[] = (workspace?.staff || []).map((st) => ({
    id: st.id,
    name: st.name,
    displayName: st.displayName,
    avatarUrl: st.avatarUrl,
    bio: st.bio,
    headline: st.headline,
    isOwner: (st.user?.memberships || []).some((m) => m.workspaceId === workspace!.id),
  }));

  return <ApexLandingPage defaultWorkspaceSlug={defaultSlug} services={services} staff={staff} />;
}
