import * as React from 'react';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@bookings/database';

export const dynamic = 'force-dynamic';

interface BookerPageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Legacy route that names a service without naming its workspace.
 *
 * A service slug is only unique within a workspace, so this cannot identify a
 * service on its own. It redirects to the canonical
 * /book/[workspaceSlug]/[serviceSlug] URL when exactly one active service
 * matches, and 404s when the answer would be a guess.
 */
export default async function LegacyServiceBookerPage({ params }: BookerPageProps) {
  const { slug } = await params;

  const matches = await prisma.service.findMany({
    where: { slug, isActive: true },
    select: { slug: true, workspace: { select: { slug: true } } },
    take: 2,
  });

  if (matches.length !== 1) {
    return notFound();
  }

  redirect(`/book/${matches[0].workspace.slug}/${matches[0].slug}`);
}
