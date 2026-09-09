import { prisma } from '@bookings/database';
import { ApexLandingPage } from './components/ApexLandingPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Rooman Bookings | Rooman Technologies Appointment & Skilling Platform',
  description:
    'Official consultation and skilling scheduling platform for Rooman Technologies. Book 1-on-1 IT career counseling, enterprise workforce upskilling, and University Center of Excellence sessions.',
};

export default async function HomePage() {
  const envSlug = process.env.NEXT_PUBLIC_DEFAULT_WORKSPACE_SLUG?.trim();
  let defaultSlug = envSlug || 'rooman-technologies';

  const workspace = await prisma.workspace.findFirst({
    where: { slug: defaultSlug },
    select: { slug: true },
  });

  if (!workspace) {
    const published = await prisma.bookingPage.findFirst({
      where: { isPublished: true },
      include: { workspace: { select: { slug: true } } },
      orderBy: { createdAt: 'asc' },
    });
    if (published?.workspace?.slug) {
      defaultSlug = published.workspace.slug;
    }
  }

  return <ApexLandingPage defaultWorkspaceSlug={defaultSlug} />;
}
