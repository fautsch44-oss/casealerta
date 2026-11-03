// Servidor MCP público de CaseAlerta — transporte Streamable HTTP.
// Vigente: 2026-07-28 (sin estado). Compatible: 2025-11-25, 2025-06-18, 2025-03-26 (saludo `initialize`).
// Solo lectura, sin autenticación, sin sesiones, sin datos personales. No es asesoría legal.
import { llmsTxt } from '@/lib/llms';
import {
  CARD_URL, INSTRUCTIONS, LATEST, LEGACY, MCP_URL, PROMPTS, RESOURCES, RESOURCE_TEMPLATES, SERVER_INFO, SUPPORTED, TOOLS,
  callTool, getPrompt, readResource,
} from '@/lib/mcp';

const META = 'io.modelcontextprotocol/';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, MCP-Protocol-Version, Mcp-Method, Mcp-Name, Mcp-Session-Id, Last-Event-ID, traceparent, tracestate',
  'Access-Control-Expose-Headers': 'MCP-Protocol-Version',
  'Access-Control-Max-Age': '86400',
};
const CAPS = { tools: { listChanged: false }, resources: { subscribe: false, listChanged: false }, prompts: { listChanged: false } };
const serverInfoMeta = { name: SERVER_INFO.name, version: SERVER_INFO.version };

type Reply = { status: number; body: object | null };
const ok = (body: object | null, status = 200): Reply => ({ status, body });
const rpcErr = (id: unknown, code: number, message: string, data?: unknown) => ({ jsonrpc: '2.0', id: id ?? null, error: data === undefined ? { code, message } : { code, message, data } });

/** Decodifica el centinela =?base64?...?= que permite la especificación en Mcp-Name. */
function headerValue(v: string | null) {
  if (v == null) return null;
  const m = /^=\?base64\?(.*)\?=$/.exec(v.trim());
  if (!m) return v.trim();
  try { return new TextDecoder().decode(Uint8Array.from(atob(m[1]), (c) => c.charCodeAt(0))); } catch { return null; }
}

function dispatch(id: unknown, method: string, params: any, modern: boolean): Reply {
  const done = (result: Record<string, unknown>, cacheable = false) => ok({
    jsonrpc: '2.0', id,
    result: modern
      ? { resultType: 'complete', ...result, ...(cacheable ? { ttlMs: 6 * 60 * 60 * 1000, cacheScope: 'public' } : {}), _meta: { [`${META}serverInfo`]: serverInfoMeta } }
      : result,
  });
  const notFound = () => ok(rpcErr(id, -32601, `Method not found: ${method}`), modern ? 404 : 200);

  switch (method) {
    case 'server/discover':
      return done({ supportedVersions: SUPPORTED, capabilities: CAPS, instructions: INSTRUCTIONS }, true);
    case 'ping':
      return modern ? notFound() : done({});
    case 'tools/list':
      return done({ tools: TOOLS }, true);
    case 'tools/call': {
      const name = params?.name;
      const out = typeof name === 'string' ? callTool(name, params?.arguments) : null;
      if (!out) return ok(rpcErr(id, -32602, `Unknown tool: ${name}. Available: ${TOOLS.map((t) => t.name).join(', ')}`));
      return done(out);
    }
    case 'resources/list':
      return done({ resources: RESOURCES }, true);
    case 'resources/templates/list':
      return done({ resourceTemplates: RESOURCE_TEMPLATES }, true);
    case 'resources/read': {
      const c = typeof params?.uri === 'string' ? readResource(params.uri, llmsTxt) : null;
      return c ? done({ contents: [c] }, true) : ok(rpcErr(id, modern ? -32602 : -32002, `Resource not found: ${params?.uri}`, { uri: params?.uri }));
    }
    case 'prompts/list':
      return done({ prompts: PROMPTS }, true);
    case 'prompts/get': {
      const p = typeof params?.name === 'string' ? getPrompt(params.name, params?.arguments) : null;
      return p ? done(p) : ok(rpcErr(id, -32602, `Unknown prompt or missing "status" argument: ${params?.name}`));
    }
    case 'completion/complete':
      return done({ completion: { values: [], hasMore: false } });
    default:
      return notFound();
  }
}

function handle(msg: any, h: Headers, single: boolean): Reply {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return ok(rpcErr(msg?.id, -32600, 'Invalid Request'), 400);
  const { id, method, params } = msg;
  const isNotification = id === undefined;
  const meta = params?._meta ?? {};
  const reqVersion = meta[`${META}protocolVersion`];

  // Era anterior: saludo `initialize`.
  if (method === 'initialize') {
    const asked = params?.protocolVersion;
    const protocolVersion = LEGACY.includes(asked) ? asked : LEGACY[0];
    return ok({ jsonrpc: '2.0', id, result: { protocolVersion, capabilities: CAPS, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS } });
  }
  if (isNotification) return ok(null, 202);

  // Era vigente: cada petición trae su versión y capacidades en _meta.
  if (typeof reqVersion === 'string') {
    if (!SUPPORTED.includes(reqVersion)) return ok(rpcErr(id, -32022, `Unsupported protocol version: ${reqVersion}`, { supported: SUPPORTED, requested: reqVersion }), 400);
    if (single) {
      const hv = h.get('mcp-protocol-version'), hm = h.get('mcp-method');
      if (!hv || hv.trim() !== reqVersion) return ok(rpcErr(id, -32020, `Header mismatch: MCP-Protocol-Version header '${hv ?? ''}' does not match body value '${reqVersion}'`), 400);
      if (!hm || hm.trim() !== method) return ok(rpcErr(id, -32020, `Header mismatch: Mcp-Method header '${hm ?? ''}' does not match body value '${method}'`), 400);
      if (['tools/call', 'prompts/get', 'resources/read'].includes(method)) {
        const want = method === 'resources/read' ? params?.uri : params?.name;
        const got = headerValue(h.get('mcp-name'));
        if (got !== want) return ok(rpcErr(id, -32020, `Header mismatch: Mcp-Name header '${got ?? ''}' does not match body value '${want ?? ''}'`), 400);
      }
    }
    if (meta[`${META}clientCapabilities`] === undefined) return ok(rpcErr(id, -32602, `Invalid params: missing _meta["${META}clientCapabilities"]`), 400);
    return dispatch(id, method, params, true);
  }

  // Petición de un cliente de la era anterior después del saludo.
  return dispatch(id, method, params, false);
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return Response.json(rpcErr(null, -32700, 'Parse error'), { status: 400, headers: cors }); }
  if (Array.isArray(body)) { // lotes: solo la era anterior los usaba
    const out = body.map((m) => handle(m, req.headers, false).body).filter(Boolean);
    return out.length ? Response.json(out, { headers: cors }) : new Response(null, { status: 202, headers: cors });
  }
  const { status, body: out } = handle(body, req.headers, true);
  const v = body?.params?._meta?.[`${META}protocolVersion`] ?? (body?.method === 'initialize' ? (out as any)?.result?.protocolVersion : req.headers.get('mcp-protocol-version'));
  const headers = { ...cors, ...(typeof v === 'string' && SUPPORTED.includes(v) ? { 'MCP-Protocol-Version': v } : {}) };
  return out ? Response.json(out, { status, headers }) : new Response(null, { status, headers });
}

// GET: sin flujo SSE (servidor sin estado) → 405 para clientes MCP; ficha legible para personas y rastreadores.
export function GET(req: Request) {
  if ((req.headers.get('accept') ?? '').includes('text/event-stream')) return new Response(null, { status: 405, headers: { ...cors, Allow: 'POST, OPTIONS' } });
  return Response.json({
    name: SERVER_INFO.name, title: SERVER_INFO.title, description: SERVER_INFO.description, version: SERVER_INFO.version,
    endpoint: MCP_URL, transport: 'streamable-http (POST JSON-RPC 2.0)', protocol: LATEST, supportedProtocolVersions: SUPPORTED,
    auth: 'none', tools: TOOLS.map((t) => ({ name: t.name, title: t.title })), serverCard: CARD_URL,
    aiCatalog: 'https://casealerta.com/.well-known/ai-catalog.json', docs: 'https://casealerta.com/llms.txt', note: 'Read-only. Not legal advice. Not affiliated with USCIS.',
  }, { headers: { ...cors, Link: `<${CARD_URL}>; rel="describedby"; type="application/mcp-server-card+json"` } });
}

export function DELETE() { return new Response(null, { status: 405, headers: { ...cors, Allow: 'POST, OPTIONS' } }); }
export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
