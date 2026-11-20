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
  // Browsers ignore this over plain http (local development), so it is safe to send everywhere.
  { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
  // Enforced part: never safe to relax and cannot break the hosting frame or sign-in.
  { key: 'Content-Security-Policy', value: "object-src 'none'; base-uri 'self'; form-action 'self'" },
  // Full policy in report-only mode: violations show in the browser console without breaking anything.
  // Check the console on the published site, then move it to Content-Security-Policy (docs/LAUNCH.md).
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://tile.openstreetmap.org",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
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
