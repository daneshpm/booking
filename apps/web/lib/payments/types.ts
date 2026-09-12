export type PaymentProvider = 'RAZORPAY' | 'STRIPE' | 'MOCK' | 'FREE';

export interface CreatePaymentOrderInput {
  bookingId: string;
  amount: number; // e.g. 50.00
  currency: string; // "USD", "INR", etc.
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  serviceName: string;
  workspaceName: string;
}

export interface PaymentOrderResult {
  success: boolean;
  provider: PaymentProvider;
  orderId: string;
  keyId?: string; // Public key / publishable key for client-side SDKs
  amount: number;
  currency: string;
  clientSecret?: string;
  /** Hosted checkout page to send the customer to. Set only when the gateway requires a redirect (e.g. Stripe Checkout Sessions). */
  redirectUrl?: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface VerifyPaymentInput {
  bookingId: string;
  provider: PaymentProvider;
  orderId: string;
  transactionId?: string;
  signature?: string;
  paymentToken?: string;
}

export interface VerifyPaymentResult {
  success: boolean;
  transactionId: string;
  error?: string;
}
