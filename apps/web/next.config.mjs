import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@bookings/core',
    '@bookings/database',
    '@bookings/ui',
    '@bookings/feature-services',
  ],
  eslint: {
    ignoreDuringBuilds: true,
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
