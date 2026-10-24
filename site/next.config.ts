import type { NextConfig } from 'next';
import redirects from './data/redirects.json';

const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: security },
      { source: '/review/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }, { key: 'X-Robots-Tag', value: 'noindex' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
  async redirects() {
    return [
      ...(redirects as { source: string; destination: string; permanent: boolean }[]),
      { source: '/en/status/:path*', destination: '/status/:path*', permanent: true },
      { source: '/precios', destination: '/#planes', permanent: false },
      { source: '/pricing', destination: '/en/#planes', permanent: false },
      { source: '/en/pricing', destination: '/en/#planes', permanent: false },
      { source: '/en/lawyers', destination: '/lawyers', permanent: true },
    ];
  },
};
export default config;
