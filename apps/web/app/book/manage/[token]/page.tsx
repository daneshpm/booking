import * as React from 'react';
import { notFound } from 'next/navigation';
import { getBookingByManageTokenAction } from '../../actions';
import { ManageBookingClient } from './ManageBookingClient';

export const dynamic = 'force-dynamic';

interface ManageBookingPageProps {
  params: Promise<{ token: string }>;
}

export default async function ManageBookingPage({ params }: ManageBookingPageProps) {
  const { token } = await params;

  const result = await getBookingByManageTokenAction(token);

  if (!result.success || !result.booking) {
    return notFound();
  }

  return <ManageBookingClient initialBooking={result.booking} token={token} />;
}
