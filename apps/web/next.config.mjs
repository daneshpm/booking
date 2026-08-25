import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../../'),
  transpilePackages: [
    '@zoho-bookings/core',
    '@zoho-bookings/database',
    '@zoho-bookings/ui',
    '@zoho-bookings/feature-services',
  ],
};

export default nextConfig;
