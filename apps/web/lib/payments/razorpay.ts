import crypto from 'crypto';
import type {
  CreatePaymentOrderInput,
  PaymentOrderResult,
  VerifyPaymentInput,
  VerifyPaymentResult,
} from './types';

/**
 * Razorpay Payment Integration
 * Supports Indian domestic cards, UPI (GPay, PhonePe, Paytm), and NetBanking.
 */
export async function createRazorpayOrder(
  input: CreatePaymentOrderInput
): Promise<PaymentOrderResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Fallback to mock/sandbox order if credentials are not yet configured in
  // environment. In production this would let a customer through a checkout
  // that can never actually collect payment, so it fails cleanly instead.
  if (!keyId || !keySecret) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        provider: 'RAZORPAY',
        orderId: '',
        amount: input.amount,
        currency: input.currency,
        error: 'Payment is not available for this workspace yet. Please contact the business.',
      };
    }
    console.info(
      'RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not found. Emulating Razorpay order in test sandbox mode.'
    );
    const mockOrderId = `order_mock_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    return {
      success: true,
      provider: 'RAZORPAY',
      orderId: mockOrderId,
      keyId: 'rzp_test_mockkey',
      amount: input.amount,
      currency: input.currency || 'INR',
      metadata: {
        receipt: `rcpt_${input.bookingId.slice(0, 10)}`,
        notes: {
          bookingId: input.bookingId,
          serviceName: input.serviceName,
        },
      },
    };
  }

  try {
    // Razorpay amounts are in the smallest currency unit (e.g. paise: 1 INR = 100 paise)
    const amountInSmallestUnit = Math.round(input.amount * 100);
    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInSmallestUnit,
        currency: input.currency || 'INR',
        receipt: `rcpt_${input.bookingId.slice(0, 12)}`,
        notes: {
          bookingId: input.bookingId,
          serviceName: input.serviceName,
          customerEmail: input.customerEmail,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Razorpay order creation failed:', errorText);
      return {
        success: false,
        provider: 'RAZORPAY',
        orderId: '',
        amount: input.amount,
        currency: input.currency,
        error: 'Failed to initialize payment gateway order.',
      };
    }

    const orderData = await response.json();
    return {
      success: true,
      provider: 'RAZORPAY',
      orderId: orderData.id,
      keyId,
      amount: input.amount,
      currency: input.currency || 'INR',
      metadata: orderData,
    };
  } catch (err: any) {
    console.error('Error connecting to Razorpay API:', err);
    return {
      success: false,
      provider: 'RAZORPAY',
      orderId: '',
      amount: input.amount,
      currency: input.currency,
      error: err.message || 'Payment provider communication error.',
    };
  }
}

export async function verifyRazorpayPayment(
  input: VerifyPaymentInput
): Promise<VerifyPaymentResult> {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // Sandbox mode without a keySecret only auto-succeeds outside production:
  // in production, missing credentials must fail verification rather than
  // silently confirm an unpaid booking.
  if (!keySecret) {
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        transactionId: '',
        error: 'Payment gateway is not configured.',
      };
    }
    const txn =
      input.transactionId || `pay_mock_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
    return {
      success: true,
      transactionId: txn,
    };
  }

  if (!input.orderId || !input.transactionId || !input.signature) {
    return {
      success: false,
      transactionId: '',
      error: 'Missing Razorpay signature or payment verification parameters.',
    };
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${input.orderId}|${input.transactionId}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    const providedBuffer = Buffer.from(input.signature, 'utf8');

    // timingSafeEqual throws on a length mismatch instead of returning false,
    // and a signature of the wrong length is just as invalid as a wrong one.
    const isMatch =
      expectedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, providedBuffer);

    if (!isMatch) {
      return {
        success: false,
        transactionId: input.transactionId,
        error: 'Invalid payment signature. Payment verification failed.',
      };
    }

    return {
      success: true,
      transactionId: input.transactionId,
    };
  } catch (err: any) {
    return {
      success: false,
      transactionId: input.transactionId || '',
      error: err.message || 'Signature verification error.',
    };
  }
}
