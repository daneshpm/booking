import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Baseline Content-Security-Policy.
 *
 * 'unsafe-inline' on script-src and style-src is a deliberate tradeoff: Next.js
 * ships inline bootstrap scripts and React inlines some styles, and adopting a
 * nonce-based strict policy is a larger change (every response needs a fresh
 * nonce threaded through the app). This still blocks a script/style tag an
 * attacker injects from a domain outside this allowlist, which is the more
 * common outcome of a stored/reflected XSS bug. Extend the allowlists here,
 * not by removing directives, if a new third-party provider is added.
 */
const isDev = process.env.NODE_ENV !== 'production';

const contentSecurityPolicy = [
  "default-src 'self'",
  // checkout.razorpay.com is the Razorpay payment widget, loaded on demand
  // only when a real (non-sandbox) Razorpay order is opened. 'unsafe-eval' is
  // added only in development: React's dev-mode instrumentation (component
  // stack reconstruction, Fast Refresh) uses eval(), production never does.
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  // Uploaded logos/avatars are stored as data: URIs; blob: covers
  // client-generated previews before upload completes.
  "img-src 'self' data: blob:",
  // Razorpay's checkout widget calls its own API and error-reporting host from
  // the browser once opened.
  "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com",
  // Razorpay's checkout renders in an iframe it injects itself.
  "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
  // Blocks this app being framed by another origin (clickjacking), in
  // addition to X-Frame-Options below for older browsers.
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * Headers applied to every response. These are cheap, broadly compatible
 * defenses.
 */
const securityHeaders = [
  // Stop the browser from second-guessing a declared content type, which is how
  // an uploaded file gets executed as a script.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // The booking pages are meant to be embedded, but the dashboard is not;
  // SAMEORIGIN blocks the dashboard being framed for clickjacking.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Do not leak the full dashboard URL, which contains ids, to third parties.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(self), geolocation=(), payment=()',
  },
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emits a self-contained server bundle so the production image needs neither
  // the repository nor dev dependencies.
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../../'),
  poweredByHeader: false,
  reactStrictMode: true,
  transpilePackages: [
    '@bookings/auth',
    '@bookings/core',
    '@bookings/database',
    '@bookings/ui',
    '@bookings/feature-services',
  ],

  async headers() {
    const headers = [{ source: '/:path*', headers: securityHeaders }];

    if (process.env.NODE_ENV === 'production') {
      headers.push({
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      });
    }

    return headers;
  },
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/appointments',
        permanent: false,
      },
    ];
  },
  // No rewrites.
  //
  // There was a `/api/py/:path*` proxy to the FastAPI service (apps/api) here.
  // It was removed because nothing in this app ever called it — every booking
  // and auth flow goes through server actions and Prisma — while it exposed,
  // unauthenticated and straight to the internet:
  //
  //   POST /api/py/auth/register  -> creates a User + Workspace + an OWNER
  //                                  membership, and issues an rb_session
  //                                  cookie valid for this entire dashboard
  //   POST /api/py/auth/login     -> mints that same cookie
  //   POST /api/py/bookings       -> writes a confirmed booking
  //
  // The middleware matcher excludes `api/` (see middleware.ts), so none of it
  // was gated at the edge either. Re-adding this proxy means re-exposing
  // unauthenticated tenant creation; if the Python service is ever needed,
  // put authentication in front of it first.
};

export default nextConfig;
