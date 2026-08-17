import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Env var overrides for both build and runtime: empty string = no base path
  basePath: typeof process.env.NEXT_PUBLIC_BASE_PATH !== "undefined"
    ? process.env.NEXT_PUBLIC_BASE_PATH
    : process.env.NODE_ENV === "production"
      ? "/mb"
      : "",
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
  async rewrites() {
    if (process.env.NODE_ENV === 'production') {
      return []
    }

    const port = process.env.MANTIS_PORT || '7070'
    const target = (process.env.MANTIS_PROXY_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, '')

    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`,
      },
    ]
  },
}



export default nextConfig