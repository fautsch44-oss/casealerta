import type { NextConfig } from 'next';
import redirects from './data/redirects.json';

const security = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

// MCP y API citable viven en Cloudflare Workers (worker/). Con MCP_WORKER_ORIGIN definido en Vercel
// (p. ej. https://casealerta-mcp.<cuenta>.workers.dev), estas rutas se reenvían al Worker sin cambiar las URLs públicas.
// Sin la variable, responden las rutas de Next (mismo código, respaldo).
const WORKER = process.env.MCP_WORKER_ORIGIN?.replace(/\/+$/, '');

const config: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/(.*)', headers: security },
      { source: '/((?!api/|mcp/|_next/|\\.well-known/).*)', headers: [{ key: 'Link', value: '</llms.txt>; rel="describedby"; type="text/plain", </openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json", </.well-known/ai-catalog.json>; rel="ai-catalog"; type="application/ai-catalog+json"' }] },
      { source: '/review/:path*', headers: [{ key: 'Access-Control-Allow-Origin', value: '*' }, { key: 'X-Robots-Tag', value: 'noindex' }] },
      { source: '/.well-known/mcp-registry-auth', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }, { key: 'Access-Control-Allow-Origin', value: '*' }] },
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache' }, { key: 'Service-Worker-Allowed', value: '/' }] },
    ];
  },
  async rewrites() {
    if (!WORKER) return { beforeFiles: [], afterFiles: [], fallback: [] };
    return {
      beforeFiles: [
        { source: '/:path*', has: [{ type: 'host', value: 'mcp.casealerta.com' }], destination: `${WORKER}/:path*` },
        { source: '/mcp/:path*', destination: `${WORKER}/mcp/:path*` },
        { source: '/api/v1/:path*', destination: `${WORKER}/api/v1/:path*` },
      ],
      afterFiles: [],
      fallback: [],
    };
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
