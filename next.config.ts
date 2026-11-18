import type { NextConfig } from 'next';

// Framing headers (X-Frame-Options / frame-ancestors) are intentionally not set: the site
// is shown inside the hosting platform's frame and the sign-in links use target="_top".
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), payment=(), usb=()',
  },
];

const nextConfig: NextConfig = {
  // Self-hosting build emits dist/standalone/server.js (see vite.config.ts and docs/INFRASTRUCTURE.md).
  ...(process.env.QOLDAN_TARGET === 'node' ? { output: 'standalone' as const } : {}),
  async headers() {
    return [
      { source: '/', headers: securityHeaders },
      { source: '/:path*', headers: securityHeaders },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;
