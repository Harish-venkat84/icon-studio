import path from 'node:path'
import type { NextConfig } from 'next'

// Extra origins allowed to call server actions, e.g. when the studio runs behind a reverse proxy.
const allowedOrigins = (process.env.STUDIO_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const nextConfig: NextConfig = {
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: ['@icon-studio/core'],
  poweredByHeader: false,
  experimental: {
    serverActions: {
      allowedOrigins,
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
