// Respuestas de descubrimiento para agentes: CORS abierto, caché de 1 h y ETag (guía de MCP Server Cards).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
};

async function etagOf(text: string) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return `"${Array.from(new Uint8Array(d).slice(0, 12)).map((b) => b.toString(16).padStart(2, '0')).join('')}"`;
}

export async function discoveryResponse(req: Request, body: unknown, type: string) {
  const text = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
  const etag = await etagOf(text);
  const headers = { ...CORS, 'Content-Type': type, 'Cache-Control': 'public, max-age=3600', ETag: etag, 'X-Robots-Tag': 'noindex' };
  if (req.headers.get('if-none-match') === etag) return new Response(null, { status: 304, headers });
  return new Response(text, { headers });
}

export const discoveryOptions = () => new Response(null, { status: 204, headers: CORS });
