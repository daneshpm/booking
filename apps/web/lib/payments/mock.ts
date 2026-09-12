import type {
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './types';

/**
 * Developer Sandbox / Mock Payment Gateway
 * Provides zero-config end-to-end payment simulation for local development,
 * CI tests, and demo environments without requiring real payment gateway credentials.
 */
export async function createMockPaymentOrder(
  input: CreatePaymentOrderInput
): Promise<PaymentOrderResult> {
  // resolvePaymentProvider falls back to MOCK whenever no real gateway is
  // configured, so this is reachable in production for any paid, non-INR
  // service with no Razorpay/Stripe credentials set. Simulating a
  // successful payment there would let a customer confirm a paid booking
  // for free, so it refuses outright instead.
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      provider: 'MOCK',
      orderId: '',
      amount: input.amount,
      currency: input.currency || 'USD',
      error: 'Payment is not available for this workspace yet. Please contact the business.',
    };
  }

  const orderId = `mock_ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return {
    success: true,
    provider: 'MOCK',
    orderId,
    amount: input.amount,
    currency: input.currency || 'USD',
    metadata: {
      bookingId: input.bookingId,
      customerEmail: input.customerEmail,
      serviceName: input.serviceName,
      isSandbox: true,
    },
  };
}

export async function verifyMockPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  // See createMockPaymentOrder: never confirm a real payment in production
  // through the mock provider, since createMockPaymentOrder itself already
  // refuses to issue an order there, so a booking can't legitimately reach
  // this in production. Refusing here too is defense in depth.
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      transactionId: '',
      error: 'Payment gateway is not configured.',
    };
  }

  // In mock mode, any valid non-empty order ID or test token completes successfully
  const transactionId =
    input.transactionId || `mock_txn_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;

  return {
    success: true,
    transactionId,
  };
}
