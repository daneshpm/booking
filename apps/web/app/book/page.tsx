import { redirect } from 'next/navigation';
import { prisma } from '@bookings/database';

export const dynamic = 'force-dynamic';

export default async function BookRootPage() {
  const workspace = await prisma.workspace.findFirst({
    where: { slug: 'rooman-technologies' },
  }) || await prisma.workspace.findFirst({
    where: { slug: 'acme-consulting' },
  });

  if (workspace) {
    redirect(`/book/${workspace.slug}`);
  }

  redirect('/services');
}
