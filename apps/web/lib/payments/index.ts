import { createMockPaymentOrder, verifyMockPayment } from './mock';
import { createRazorpayOrder, verifyRazorpayPayment } from './razorpay';
import { createStripePaymentSession, verifyStripePayment } from './stripe';
import type {
  CreatePaymentOrderInput,
  PaymentOrderResult,
  PaymentProvider,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './types';

export * from './types';

/**
 * Resolves the active payment provider based on configuration or currency.
 * Defaults to Razorpay for INR / Indian setups, Stripe for Global, or Mock if unconfigured.
 */
export function resolvePaymentProvider(currency?: string): PaymentProvider {
  const configured = process.env.PAYMENT_PROVIDER?.toUpperCase();
  if (configured === 'RAZORPAY' || configured === 'STRIPE' || configured === 'MOCK') {
    return configured as PaymentProvider;
  }

  // Automatic smart detection by environment variables or currency
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    return 'RAZORPAY';
  }
  if (process.env.STRIPE_SECRET_KEY) {
    return 'STRIPE';
  }
  if (currency?.toUpperCase() === 'INR') {
    return 'RAZORPAY';
  }

  return 'MOCK';
}

export async function createPaymentOrder(
  input: CreatePaymentOrderInput
): Promise<PaymentOrderResult> {
  const provider = resolvePaymentProvider(input.currency);

  switch (provider) {
    case 'RAZORPAY':
      return createRazorpayOrder(input);
    case 'STRIPE':
      return createStripePaymentSession(input);
    case 'MOCK':
    default:
      return createMockPaymentOrder(input);
  }
}

export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  switch (input.provider) {
    case 'RAZORPAY':
      return verifyRazorpayPayment(input);
    case 'STRIPE':
      return verifyStripePayment(input);
    case 'MOCK':
    default:
      return verifyMockPayment(input);
  }
}
