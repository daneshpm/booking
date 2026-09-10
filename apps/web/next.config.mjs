import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Headers applied to every response.
 *
 * These are cheap, broadly compatible defenses. A Content-Security-Policy is
 * deliberately not set here: it needs per-deployment tuning for the analytics
 * and video provider in use, and a wrong one silently breaks the page.
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
  async rewrites() {
    const pythonApiUrl = process.env.PYTHON_API_URL || 'http://127.0.0.1:8000';
    return [
      {
        source: '/api/py/:path*',
        destination: `${pythonApiUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
