// Prueba el paquete del Worker (dist/index.js) sin red: las mismas pruebas de protocolo que el servidor de Next.
import worker from '../dist/index.js';

const V = '2026-07-28';
const H = 'https://casealerta-mcp.example.workers.dev';
let fails = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FAIL'} ${name}${extra ? ` — ${extra}` : ''}`); if (!cond) fails++; };
const meta = { 'io.modelcontextprotocol/protocolVersion': V, 'io.modelcontextprotocol/clientCapabilities': {} };
const post = (body, headers = {}) => worker.fetch(new Request(`${H}/mcp/`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }));
const modern = (method, params = {}, name) => post({ jsonrpc: '2.0', id: 1, method, params: { ...params, _meta: meta } }, { 'MCP-Protocol-Version': V, 'Mcp-Method': method, ...(name ? { 'Mcp-Name': name } : {}) });

let r = await modern('server/discover'); let j = await r.json();
check('server/discover', r.status === 200 && j.result.supportedVersions[0] === V && j.result.resultType === 'complete');
check('marca del Worker', r.headers.get('x-served-by')?.includes('Cloudflare'));
r = await modern('tools/list'); j = await r.json();
check('tools/list (6 + caché)', j.result.tools.length === 6 && j.result.ttlMs > 0 && j.result.cacheScope === 'public');
r = await modern('tools/call', { name: 'explicar_estatus', arguments: { status: 'RFE', form: 'I-130', lang: 'es' } }, 'explicar_estatus'); j = await r.json();
check('explicar_estatus RFE I-130 (nota del formulario)', j.result.structuredContent?.status === 'Request for Additional Evidence Was Sent' && j.result.structuredContent.form === 'I-130');
r = await modern('tools/call', { name: 'buscar_guia', arguments: { query: 'I-751' } }, 'buscar_guia'); j = await r.json();
check('buscar_guia (noticias empaquetadas)', j.result.structuredContent?.results?.length > 0);
r = await modern('tools/call', { name: 'tiempo_tipico', arguments: { form: 'n400' } }, 'tiempo_tipico'); j = await r.json();
check('tiempo_tipico n400', j.result.structuredContent?.form === 'N-400');
r = await modern('resources/read', { uri: 'https://casealerta.com/llms.txt' }, 'https://casealerta.com/llms.txt'); j = await r.json();
check('resources/read llms.txt', j.result.contents?.[0]?.text?.startsWith('# CaseAlerta'));
r = await post({ jsonrpc: '2.0', id: 1, method: 'server/discover', params: { _meta: meta } }, { 'MCP-Protocol-Version': V, 'Mcp-Method': 'tools/list' });
check('encabezado distinto → 400 / -32020', r.status === 400 && (await r.json()).error.code === -32020);
r = await post({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: { _meta: { ...meta, 'io.modelcontextprotocol/protocolVersion': '2099-01-01' } } }, { 'MCP-Protocol-Version': '2099-01-01', 'Mcp-Method': 'tools/list' });
check('versión no soportada → 400 / -32022', r.status === 400 && (await r.json()).error.code === -32022);
r = await post({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 't', version: '1' } } }); j = await r.json();
check('initialize 2025-06-18 (clientes anteriores)', j.result?.protocolVersion === '2025-06-18');
r = await post({ jsonrpc: '2.0', method: 'notifications/initialized' });
check('notificación → 202', r.status === 202);
r = await worker.fetch(new Request(`${H}/mcp/`, { headers: { accept: 'text/event-stream' } }));
check('GET SSE → 405', r.status === 405);
r = await worker.fetch(new Request(`${H}/mcp/server-card/`)); j = await r.json();
check('Server Card', r.headers.get('content-type') === 'application/mcp-server-card+json' && j.remotes[0].url === 'https://casealerta.com/mcp/' && !!r.headers.get('etag'));
r = await worker.fetch(new Request(`${H}/mcp/server-card/`, { headers: { 'if-none-match': r.headers.get('etag') } }));
check('Server Card 304 con ETag', r.status === 304);
r = await worker.fetch(new Request(`${H}/.well-known/ai-catalog.json`)); j = await r.json();
check('AI Catalog', j.entries.length === 3);
r = await worker.fetch(new Request(`${H}/api/v1/status-meaning/?status=Card%20Was%20Mailed%20To%20Me&form=I-485&lang=es`)); j = await r.json();
check('API citable', r.status === 200 && j.form === 'I-485' && j.url.startsWith('https://casealerta.com/estatus/'));
r = await worker.fetch(new Request(`${H}/api/v1/statuses/`)); j = await r.json();
check('catálogo de estatus', j.statuses.length > 40);
r = await worker.fetch(new Request(`${H}/nada`));
check('ruta desconocida → 404', r.status === 404);

console.log(fails ? `\n${fails} FALLAS` : '\nTodo OK');
process.exit(fails ? 1 : 0);
