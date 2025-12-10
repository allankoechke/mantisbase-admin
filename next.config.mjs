import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { version } = require('./package.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  output: 'export',
  trailingSlash: true,
}



export default nextConfig