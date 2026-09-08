import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailResult {
  delivered: boolean;
  error?: string;
}

let cachedTransporter: Transporter | null = null;
let transportUnavailableReason: string | null = null;

/**
 * Build the SMTP transport from the environment.
 *
 * Returns null when SMTP_HOST is unset. Delivery is then skipped and recorded
 * as such rather than throwing, so a deployment without mail configured still
 * takes bookings.
 */
function getTransporter(): Transporter | null {
  if (cachedTransporter) return cachedTransporter;
  if (transportUnavailableReason) return null;

  const host = process.env.SMTP_HOST;
  if (!host) {
    transportUnavailableReason = 'SMTP_HOST is not configured';
    return null;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    // Implicit TLS on 465; STARTTLS is negotiated on other ports.
    secure: port === 465,
    auth: user ? { user, pass } : undefined,
  });

  return cachedTransporter;
}

/** Address used as the sender for all outbound mail. */
export function getFromAddress(): string {
  return process.env.EMAIL_FROM || 'Rooman Bookings <noreply@rooman.local>';
}

/** True when outbound email is configured for this deployment. */
export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST);
}

/**
 * Send one message.
 *
 * Never throws. A transport failure is returned as a result so the caller can
 * record it against the booking without rolling back the appointment.
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const transporter = getTransporter();

  if (!transporter) {
    return { delivered: false, error: transportUnavailableReason ?? 'Mail transport unavailable' };
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
    return { delivered: true };
  } catch (err) {
    return {
      delivered: false,
      error: err instanceof Error ? err.message : 'Unknown mail transport error',
    };
  }
}

/** Reset cached transport state. Used by tests. */
export function __resetMailerForTests(): void {
  cachedTransporter = null;
  transportUnavailableReason = null;
}
