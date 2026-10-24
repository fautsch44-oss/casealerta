// Servidor MCP público de CaseAlerta (Streamable HTTP sin estado, protocolo 2025-06-18).
// Herramientas de solo lectura sobre el catálogo público: qué significa un estatus, tiempo típico de un formulario y búsqueda de formularios.
// No consulta casos personales ni llama a USCIS: solo contenido explicativo citable. No es asesoría legal.
import { FORMS, STATUSES, applies, fName, fShort, formByCode, formPath, note, pick, rangeText, statusByCode, statusPath, w1Path } from '@/lib/catalog';
import { SITE } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

const PROTOCOL = '2025-06-18';
const SOURCE = 'CaseAlerta (casealerta.com) · AI-assisted, reviewed · Not legal advice · Typical ranges, never an exact date.';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type, mcp-protocol-version, mcp-session-id, accept',
};
const langOf = (v: unknown): Lang => (v === 'es' ? 'es' : 'en');

const TOOLS = [
  {
    name: 'explicar_estatus',
    title: 'Explain a USCIS case status / Explicar un estatus de USCIS',
    description: 'Explains in plain language what an official USCIS case status means and what to do next, optionally for a specific form. Bilingual (en/es).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Exact USCIS status text, e.g. "Case Was Received" or "Request for Evidence Was Sent".' },
        form: { type: 'string', description: 'Optional form code, e.g. "I-485".' },
        lang: { type: 'string', enum: ['en', 'es'], default: 'en' },
      },
      required: ['status'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'tiempo_tipico',
    title: 'Typical processing range / Tiempo típico',
    description: 'Returns the typical processing range (never an exact date) and the usual milestones for a USCIS form.',
    inputSchema: {
      type: 'object',
      properties: { form: { type: 'string', description: 'Form code, e.g. "I-130".' }, lang: { type: 'string', enum: ['en', 'es'], default: 'en' } },
      required: ['form'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: 'buscar_formulario',
    title: 'Find a USCIS form / Buscar formulario',
    description: 'Searches USCIS forms by code or words (e.g. "green card", "permiso de trabajo") and returns matching forms with links.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string' }, lang: { type: 'string', enum: ['en', 'es'], default: 'en' } },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

type Out = { text: string; data: Record<string, unknown>; isError?: boolean };

function explicar(args: any): Out {
  const lang = langOf(args?.lang);
  const st = statusByCode(String(args?.status ?? ''));
  if (!st) return { isError: true, text: `Unknown status. Use the exact USCIS text. Catalog: ${SITE}/api/v1/statuses`, data: { error: 'unknown_status' } };
  const form = formByCode(args?.form);
  const useForm = form && applies(form, st) ? form : undefined;
  const url = `${SITE}${useForm ? w1Path(lang, useForm, st) : statusPath(lang, st)}`;
  const data = {
    status: st.code, title: lang === 'es' ? st.title_es : st.code, form: useForm?.code ?? null,
    meaning: (useForm && note(useForm, st, lang)) || pick(lang, st.meaning_es, st.meaning_en),
    next_steps: pick(lang, st.next_es, st.next_en), typical_range: useForm ? rangeText(lang, useForm) : null, url, source: SOURCE,
  };
  const next = Array.isArray(data.next_steps) ? (data.next_steps as string[]).map((x) => `- ${x}`).join('\n') : String(data.next_steps ?? '');
  return { data, text: `${data.title}${data.form ? ` (${data.form})` : ''}\n\n${data.meaning}\n\n${lang === 'es' ? 'Qué sigue' : 'What to do next'}:\n${next}${data.typical_range ? `\n\n${lang === 'es' ? 'Rango típico' : 'Typical range'}: ${data.typical_range}` : ''}\n\n${url}\n${SOURCE}` };
}

function tiempo(args: any): Out {
  const lang = langOf(args?.lang);
  const f = formByCode(args?.form);
  if (!f) return { isError: true, text: 'Unknown form code. Try buscar_formulario first.', data: { error: 'unknown_form' } };
  const url = `${SITE}${formPath(lang, f)}`;
  const data = { form: f.code, name: fName(lang, f), typical_range: rangeText(lang, f), milestones: pick(lang, f.milestones_es, f.milestones_en), url, source: SOURCE };
  return { data, text: `${f.code} · ${data.name}\n${lang === 'es' ? 'Rango típico' : 'Typical range'}: ${data.typical_range ?? (lang === 'es' ? 'USCIS no publica un rango único' : 'USCIS does not publish a single range')}\n${(data.milestones as string[]).map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n${url}\n${SOURCE}` };
}

function buscar(args: any): Out {
  const lang = langOf(args?.lang);
  const q = String(args?.query ?? '').toLowerCase().trim();
  if (!q) return { isError: true, text: 'Empty query.', data: { error: 'empty_query' } };
  const hits = FORMS.filter((f) => [f.code, f.name_en, f.name_es, f.short_en, f.short_es].some((s) => s.toLowerCase().includes(q))).slice(0, 8)
    .map((f) => ({ form: f.code, name: fName(lang, f), short: fShort(lang, f), typical_range: rangeText(lang, f), url: `${SITE}${formPath(lang, f)}` }));
  return { data: { results: hits, source: SOURCE }, text: hits.length ? hits.map((h) => `${h.form} · ${h.short} — ${h.url}`).join('\n') : (lang === 'es' ? 'Sin resultados.' : 'No results.') };
}

const rpc = (id: unknown, result: unknown) => ({ jsonrpc: '2.0', id, result });
const rpcErr = (id: unknown, code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } });

function handle(msg: any): object | null {
  const { id, method, params } = msg ?? {};
  if (typeof method !== 'string') return rpcErr(id, -32600, 'Invalid Request');
  if (method.startsWith('notifications/')) return null;
  switch (method) {
    case 'initialize':
      return rpc(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'casealerta', title: 'CaseAlerta — USCIS case status explained', version: '1.0.0' },
        instructions: `Bilingual (en/es) explanations of USCIS case statuses and forms. ${STATUSES.length} statuses, ${FORMS.length} forms. Read-only. Not legal advice.`,
      });
    case 'ping': return rpc(id, {});
    case 'tools/list': return rpc(id, { tools: TOOLS });
    case 'tools/call': {
      const name = params?.name; const args = params?.arguments ?? {};
      const fn = name === 'explicar_estatus' ? explicar : name === 'tiempo_tipico' ? tiempo : name === 'buscar_formulario' ? buscar : null;
      if (!fn) return rpcErr(id, -32602, `Unknown tool: ${name}`);
      const out = fn(args);
      return rpc(id, { content: [{ type: 'text', text: out.text }], structuredContent: out.data, isError: !!out.isError });
    }
    case 'resources/list': return rpc(id, { resources: [] });
    case 'prompts/list': return rpc(id, { prompts: [] });
    default: return rpcErr(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(req: Request) {
  let body: any;
  try { body = await req.json(); } catch { return Response.json(rpcErr(null, -32700, 'Parse error'), { status: 400, headers: cors }); }
  if (Array.isArray(body)) {
    const out = body.map(handle).filter(Boolean);
    return out.length ? Response.json(out, { headers: cors }) : new Response(null, { status: 202, headers: cors });
  }
  const out = handle(body);
  return out ? Response.json(out, { headers: { ...cors, 'MCP-Protocol-Version': PROTOCOL } }) : new Response(null, { status: 202, headers: cors });
}

export function GET() {
  return Response.json({
    name: 'casealerta', protocol: PROTOCOL, transport: 'streamable-http (POST JSON-RPC)', endpoint: `${SITE}/mcp`,
    tools: TOOLS.map((t) => t.name), docs: `${SITE}/llms.txt`, note: 'Read-only. Not legal advice.',
  }, { headers: cors });
}

export function OPTIONS() { return new Response(null, { status: 204, headers: cors }); }
