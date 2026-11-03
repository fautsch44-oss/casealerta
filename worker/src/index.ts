// CaseAlerta en Cloudflare Workers: servidor MCP público y API citable.
// Mismo código que la web (site/lib): el MCP, la Server Card, el AI Catalog y la API salen de los mismos módulos.
// Llega por: casealerta.com/mcp/ y /api/v1/ (Vercel reenvía) · mcp.casealerta.com · casealerta-mcp.<cuenta>.workers.dev
import { statusMeaning, statusesCatalog } from '@/lib/api';
import { discoveryOptions, discoveryResponse } from '@/lib/discovery';
import { AI_CATALOG, SERVER_CARD } from '@/lib/mcp';
import { mcpDelete, mcpGet, mcpOptions, mcpPost } from '@/lib/mcp-http';

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Access-Control-Allow-Origin': '*' } });

async function route(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname; // sin diagonal final
  const m = req.method;

  if (p === '/mcp' || p === '/') {
    if (m === 'POST') return mcpPost(req);
    if (m === 'GET' || m === 'HEAD') return mcpGet(req);
    if (m === 'DELETE') return mcpDelete();
    if (m === 'OPTIONS') return mcpOptions();
    return new Response(null, { status: 405, headers: { Allow: 'POST, GET, OPTIONS' } });
  }
  if (m === 'OPTIONS') return discoveryOptions();
  if (m !== 'GET' && m !== 'HEAD') return new Response(null, { status: 405, headers: { Allow: 'GET, OPTIONS' } });

  switch (p) {
    case '/mcp/server-card':
      return discoveryResponse(req, SERVER_CARD, 'application/mcp-server-card+json');
    case '/.well-known/mcp/server-card.json':
    case '/.well-known/mcp.json':
      return discoveryResponse(req, SERVER_CARD, 'application/json');
    case '/.well-known/ai-catalog.json':
      return discoveryResponse(req, AI_CATALOG, 'application/ai-catalog+json');
    case '/.well-known/mcp/catalog.json':
      return discoveryResponse(req, { specVersion: AI_CATALOG.specVersion, entries: AI_CATALOG.entries.filter((e) => e.type === 'application/mcp-server-card+json') }, 'application/json');
    case '/api/v1/status-meaning':
      return statusMeaning(req);
    case '/api/v1/statuses':
      return statusesCatalog();
    case '/salud':
      return json({ ok: true, app: 'casealerta-mcp', at: new Date().toISOString() });
    default:
      return json({ error: 'not_found', mcp: 'https://casealerta.com/mcp/', docs: 'https://casealerta.com/llms.txt' }, 404);
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    try {
      const res = await route(req);
      const h = new Headers(res.headers);
      h.set('X-Served-By', 'casealerta-mcp (Cloudflare Workers)');
      if (!h.has('X-Robots-Tag') && new URL(req.url).pathname.startsWith('/mcp')) h.set('X-Robots-Tag', 'noindex');
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
    } catch (e) {
      return json({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Internal error' } }, 500);
    }
  },
};
