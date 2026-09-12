import { redirect } from 'next/navigation';
import { verifyAndConfirmPaymentAction } from '../actions';

export const dynamic = 'force-dynamic';

interface PaymentConfirmPageProps {
  searchParams: Promise<{ bookingId?: string; session_id?: string }>;
}

/**
 * Stripe Checkout redirects here after the customer pays on Stripe's hosted
 * page, where there's no React state left from BookingFlowClient to resume.
 * This confirms the payment server-side and hands off to the manage page.
 */
export default async function PaymentConfirmPage({ searchParams }: PaymentConfirmPageProps) {
  const { bookingId, session_id: sessionId } = await searchParams;

  if (!bookingId || !sessionId) {
    return <ConfirmationError message="Missing payment confirmation details." />;
  }

  const result = await verifyAndConfirmPaymentAction({
    bookingId,
    provider: 'STRIPE',
    orderId: sessionId,
  });

  if (result.success && result.manageUrl) {
    redirect(result.manageUrl);
  }

  return (
    <ConfirmationError
      message={result.error || 'We could not confirm your payment. Please contact the business.'}
    />
  );
}

function ConfirmationError({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-lg font-bold text-slate-800">Payment confirmation</h1>
        <p className="text-sm text-slate-500">{message}</p>
        <a href="/book" className="text-sm font-semibold text-purple-700 hover:text-purple-900">
          Back to booking
        </a>
      </div>
    </div>
  );
}
