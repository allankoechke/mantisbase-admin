import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use basePath in production, or if explicitly set via env var
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/mb' : ''),
  env: {
    MANTIS_ADMIN_VERSION: version,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Only use static export in production builds, not in development
  // This allows dynamic routes to work in development
  ...(process.env.NODE_ENV === 'production' && { output: 'export' }),
  trailingSlash: true,
}



export default nextConfig