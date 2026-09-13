import crypto from 'crypto';
import type {
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './types';

/**
 * Stripe Payment Integration
 * Supports International cards, Apple Pay, and Google Pay.
 */
export async function createStripePaymentSession(
  input: CreatePaymentOrderInput
): Promise<PaymentOrderResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  // In production this would let a customer through a checkout that can
  // never actually collect payment, so it fails cleanly instead.
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        provider: 'STRIPE',
        orderId: '',
        amount: input.amount,
        currency: input.currency,
        error: 'Payment is not available for this workspace yet. Please contact the business.',
      };
    }
    console.info('STRIPE_SECRET_KEY not found. Emulating Stripe payment in test sandbox mode.');
    const mockSessionId = `cs_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return {
      success: true,
      provider: 'STRIPE',
      orderId: mockSessionId,
      keyId: publishableKey || 'pk_test_mock',
      amount: input.amount,
      currency: input.currency || 'USD',
      metadata: {
        bookingId: input.bookingId,
        serviceName: input.serviceName,
      },
    };
  }

  try {
    const amountInCents = Math.round(input.amount * 100);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const params = new URLSearchParams();
    params.append('mode', 'payment');
    params.append(
      'success_url',
      `${appUrl}/book/payment-confirm?bookingId=${encodeURIComponent(input.bookingId)}&session_id={CHECKOUT_SESSION_ID}`
    );
    params.append('cancel_url', `${appUrl}/book`);
    params.append('customer_email', input.customerEmail);
    params.append('line_items[0][price_data][currency]', (input.currency || 'usd').toLowerCase());
    params.append('line_items[0][price_data][unit_amount]', amountInCents.toString());
    params.append(
      'line_items[0][price_data][product_data][name]',
      `${input.serviceName} - ${input.workspaceName}`
    );
    params.append('line_items[0][quantity]', '1');
    params.append('metadata[bookingId]', input.bookingId);

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Stripe session creation failed:', errorData);
      return {
        success: false,
        provider: 'STRIPE',
        orderId: '',
        amount: input.amount,
        currency: input.currency,
        error: errorData.error?.message || 'Failed to create Stripe checkout session.',
      };
    }

    const session = await response.json();
    return {
      success: true,
      provider: 'STRIPE',
      orderId: session.id,
      keyId: publishableKey,
      clientSecret: session.client_secret,
      // Checkout Sessions are paid on Stripe's hosted page, not embedded in
      // this app, so the customer has to be redirected there to actually pay.
      redirectUrl: session.url,
      amount: input.amount,
      currency: input.currency,
      metadata: session,
    };
  } catch (err: any) {
    console.error('Error connecting to Stripe API:', err);
    return {
      success: false,
      provider: 'STRIPE',
      orderId: '',
      amount: input.amount,
      currency: input.currency,
      error: 'Stripe connection error.',
    };
  }
}

export async function verifyStripePayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  // Sandbox mode without a secretKey only auto-succeeds outside production:
  // in production, missing credentials must fail verification rather than
  // silently confirm an unpaid booking.
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        transactionId: '',
        error: 'Payment gateway is not configured.',
      };
    }
    const txn =
      input.transactionId || `ch_mock_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    return {
      success: true,
      transactionId: txn,
    };
  }

  try {
    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${input.orderId}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      return {
        success: false,
        transactionId: '',
        error: 'Failed to verify Stripe payment session.',
      };
    }

    const session = await response.json();
    if (session.payment_status !== 'paid') {
      return {
        success: false,
        transactionId: session.payment_intent || '',
        error: `Payment is not completed (status: ${session.payment_status}).`,
      };
    }

    return {
      success: true,
      transactionId: session.payment_intent || session.id,
    };
  } catch (err: any) {
    console.error('Error verifying Stripe payment:', err);
    return {
      success: false,
      transactionId: input.transactionId || '',
      error: 'Stripe verification error.',
    };
  }
}
