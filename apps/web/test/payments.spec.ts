import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { createRazorpayOrder, verifyRazorpayPayment } from '../lib/payments/razorpay';
import { verifyStripePayment } from '../lib/payments/stripe';
import type { VerifyPaymentInput } from '../lib/payments/types';

/**
 * Payment verification is the boundary between "a customer clicked something"
 * and "this booking is paid for". Everything here is about that boundary
 * refusing to be talked into a yes: a forged signature, a signature lifted
 * from a different order, an unpaid Stripe session, or a gateway that isn't
 * configured at all must never come back successful.
 */

const SECRET = 'rzp_test_secret_key';

/** The signature Razorpay itself would send for this order/payment pair. */
function razorpaySignature(orderId: string, paymentId: string, secret = SECRET): string {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

function verifyInput(overrides: Partial<VerifyPaymentInput> = {}): VerifyPaymentInput {
  return {
    bookingId: 'booking_1',
    provider: 'RAZORPAY',
    orderId: 'order_ABC123',
    transactionId: 'pay_XYZ789',
    ...overrides,
  };
}

/**
 * NODE_ENV and the gateway credentials decide whether these functions fail
 * closed, so every test restores exactly what it found.
 */
const ORIGINAL_ENV = { ...process.env };

function setEnv(values: Record<string, string | undefined>): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete (process.env as Record<string, string | undefined>)[key];
    } else {
      (process.env as Record<string, string | undefined>)[key] = value;
    }
  }
}

beforeEach(() => {
  setEnv({
    RAZORPAY_KEY_ID: undefined,
    RAZORPAY_KEY_SECRET: undefined,
    STRIPE_SECRET_KEY: undefined,
    NODE_ENV: 'test',
  });
});

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete (process.env as Record<string, string | undefined>)[key];
  }
  Object.assign(process.env, ORIGINAL_ENV);
});

describe('Razorpay signature verification', () => {
  beforeEach(() => setEnv({ RAZORPAY_KEY_SECRET: SECRET }));

  it('accepts the signature Razorpay would actually send', async () => {
    const input = verifyInput();
    const result = await verifyRazorpayPayment({
      ...input,
      signature: razorpaySignature(input.orderId, input.transactionId!),
    });

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('pay_XYZ789');
  });

  it('rejects a tampered signature of the correct length', async () => {
    const input = verifyInput();
    const real = razorpaySignature(input.orderId, input.transactionId!);
    // Flip the first character, keeping the length identical so the rejection
    // comes from the comparison rather than the length guard.
    const forged = (real[0] === 'a' ? 'b' : 'a') + real.slice(1);

    const result = await verifyRazorpayPayment({ ...input, signature: forged });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid payment signature/i);
  });

  it('rejects a signature of the wrong length without throwing', async () => {
    // timingSafeEqual throws on a length mismatch, so a truncated signature
    // must be caught by the explicit length check and not escape as a 500.
    const result = await verifyRazorpayPayment({ ...verifyInput(), signature: 'abc123' });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a signature that was valid for a different order', async () => {
    // A signature captured from the attacker's own cheap booking must not
    // confirm someone else's expensive one.
    const stolen = razorpaySignature('order_SOMEONE_ELSE', 'pay_XYZ789');

    const result = await verifyRazorpayPayment({ ...verifyInput(), signature: stolen });

    expect(result.success).toBe(false);
  });

  it('rejects a signature that was valid for a different payment id', async () => {
    const stolen = razorpaySignature('order_ABC123', 'pay_DIFFERENT');

    const result = await verifyRazorpayPayment({ ...verifyInput(), signature: stolen });

    expect(result.success).toBe(false);
  });

  it('rejects a signature computed with the wrong secret', async () => {
    const wrongSecret = razorpaySignature('order_ABC123', 'pay_XYZ789', 'not_the_real_secret');

    const result = await verifyRazorpayPayment({ ...verifyInput(), signature: wrongSecret });

    expect(result.success).toBe(false);
  });

  it('rejects when the signature is missing entirely', async () => {
    const result = await verifyRazorpayPayment(verifyInput());

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/missing/i);
  });

  it('rejects when the order id is missing', async () => {
    const result = await verifyRazorpayPayment(
      verifyInput({ orderId: '', signature: 'a'.repeat(64) })
    );

    expect(result.success).toBe(false);
  });
});

describe('Razorpay behaviour when the gateway is not configured', () => {
  it('fails closed in production rather than confirming an unpaid booking', async () => {
    setEnv({ NODE_ENV: 'production', RAZORPAY_KEY_SECRET: undefined });

    const result = await verifyRazorpayPayment({
      ...verifyInput(),
      signature: 'anything-at-all',
    });

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  it('auto-succeeds outside production so local development can run', async () => {
    setEnv({ NODE_ENV: 'development', RAZORPAY_KEY_SECRET: undefined });

    const result = await verifyRazorpayPayment(verifyInput());

    expect(result.success).toBe(true);
  });

  it('refuses to open a checkout in production it could never collect on', async () => {
    setEnv({ NODE_ENV: 'production', RAZORPAY_KEY_ID: undefined, RAZORPAY_KEY_SECRET: undefined });

    const result = await createRazorpayOrder({
      bookingId: 'booking_1',
      amount: 500,
      currency: 'INR',
      customerName: 'Test Customer',
      customerEmail: 'customer@example.com',
      serviceName: 'Consultation',
      workspaceName: 'Test Workspace',
    });

    expect(result.success).toBe(false);
    expect(result.orderId).toBe('');
  });
});

describe('Stripe payment verification', () => {
  const realFetch = globalThis.fetch;

  /** Replace fetch with one that answers with a fixed Stripe session payload. */
  function stubStripeSession(body: unknown, ok = true): void {
    globalThis.fetch = (async () => ({
      ok,
      json: async () => body,
      text: async () => JSON.stringify(body),
    })) as unknown as typeof fetch;
  }

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it('accepts a session Stripe reports as paid', async () => {
    setEnv({ STRIPE_SECRET_KEY: 'sk_test_123' });
    stubStripeSession({ payment_status: 'paid', payment_intent: 'pi_12345', id: 'cs_test_1' });

    const result = await verifyStripePayment(verifyInput({ provider: 'STRIPE' }));

    expect(result.success).toBe(true);
    expect(result.transactionId).toBe('pi_12345');
  });

  it('rejects a session that has not actually been paid', async () => {
    // The decisive test: the customer reaching the success URL means nothing.
    // Only Stripe's own payment_status does.
    setEnv({ STRIPE_SECRET_KEY: 'sk_test_123' });
    stubStripeSession({ payment_status: 'unpaid', payment_intent: 'pi_12345' });

    const result = await verifyStripePayment(verifyInput({ provider: 'STRIPE' }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not completed/i);
  });

  it('rejects a session Stripe reports as still awaiting payment', async () => {
    setEnv({ STRIPE_SECRET_KEY: 'sk_test_123' });
    stubStripeSession({ payment_status: 'no_payment_required', payment_intent: 'pi_1' });

    const result = await verifyStripePayment(verifyInput({ provider: 'STRIPE' }));

    expect(result.success).toBe(false);
  });

  it('rejects when Stripe will not return the session at all', async () => {
    setEnv({ STRIPE_SECRET_KEY: 'sk_test_123' });
    stubStripeSession({ error: 'no such session' }, false);

    const result = await verifyStripePayment(verifyInput({ provider: 'STRIPE' }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/failed to verify/i);
  });

  it('rejects when the call to Stripe throws', async () => {
    setEnv({ STRIPE_SECRET_KEY: 'sk_test_123' });
    globalThis.fetch = (async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;

    const result = await verifyStripePayment(verifyInput({ provider: 'STRIPE' }));

    expect(result.success).toBe(false);
  });

  it('fails closed in production when no secret key is configured', async () => {
    setEnv({ NODE_ENV: 'production', STRIPE_SECRET_KEY: undefined });

    const result = await verifyStripePayment(verifyInput({ provider: 'STRIPE' }));

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not configured/i);
  });

  it('auto-succeeds outside production so local development can run', async () => {
    setEnv({ NODE_ENV: 'development', STRIPE_SECRET_KEY: undefined });

    const result = await verifyStripePayment(verifyInput({ provider: 'STRIPE' }));

    expect(result.success).toBe(true);
  });
});
