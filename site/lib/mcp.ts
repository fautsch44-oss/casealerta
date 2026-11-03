// Núcleo del servidor MCP público de CaseAlerta.
// Habla el protocolo vigente 2026-07-28 (sin estado: _meta por petición, server/discover, resultType, ttlMs/cacheScope)
// y mantiene compatibilidad con clientes que todavía hacen el saludo `initialize` (2025-11-25, 2025-06-18, 2025-03-26).
// Solo lectura sobre el catálogo público: no consulta casos personales, no llama a USCIS y no guarda nada. No es asesoría legal.
import { FORMS, NEWS, STATUSES, applies, fName, fShort, formByCode, formPath, newsPath, note, pick, rangeText, statusByCode, statusPath, w1Path } from '@/lib/catalog';
import { CENTERS, RECEIPT_RE, cleanReceipt } from '@/lib/centers';
import { P, SITE } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

export const LATEST = '2026-07-28';
export const LEGACY = ['2025-11-25', '2025-06-18', '2025-03-26'];
export const SUPPORTED = [LATEST, ...LEGACY];
export const SERVER_NAME = 'com.casealerta/casealerta';
export const SERVER_VERSION = '2.0.0';
export const MCP_URL = `${SITE}/mcp/`;
export const CARD_URL = `${SITE}/mcp/server-card/`;
const ICON = { src: `${SITE}/sello.png`, mimeType: 'image/png', sizes: ['512x512'] };
const SOURCE = 'CaseAlerta (casealerta.com) · AI-assisted, reviewed · Not legal advice · Typical ranges, never an exact date · Not affiliated with USCIS.';
const TTL = 6 * 60 * 60 * 1000; // el catálogo cambia, a lo más, una vez al día

export const SERVER_INFO = {
  name: SERVER_NAME,
  title: 'CaseAlerta — USCIS case status explained (EN/ES)',
  version: SERVER_VERSION,
  description: 'Bilingual explanations of USCIS case statuses and forms, typical processing ranges and immigration guides.',
  websiteUrl: SITE,
  icons: [ICON],
};

export const INSTRUCTIONS = [
  `CaseAlerta explains official USCIS case statuses in plain English or Spanish (lang "en" | "es"). Catalog: ${STATUSES.length} statuses, ${FORMS.length} forms, ${NEWS.length} guides.`,
  'Typical flow: analizar_recibo (if the user gives a receipt number) → explicar_estatus with the exact USCIS status text and the form code → tiempo_tipico for the usual range.',
  'Always cite the canonical url returned by each tool. Present ranges as typical, never as a promised decision date. This is general information, not legal advice; suggest an immigration attorney for case-specific legal questions.',
  `To check the live status of a receipt number, send the user to ${SITE}/en/ (English) or ${SITE}/ (Spanish); this server never queries USCIS.`,
].join(' ');

const langProp = { type: 'string', enum: ['en', 'es'], default: 'en', description: 'Answer language: "en" English, "es" Spanish.' };
const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const urlProp = { type: 'string', format: 'uri' };

export const TOOLS = [
  {
    name: 'analizar_recibo',
    title: 'Analyze a USCIS receipt number / Analizar número de recibo',
    description: 'Validates a USCIS receipt number (3 letters + 10 digits, e.g. IOE0912345678) and tells which service center or system issued it, plus where to check its live status. Does not query USCIS and stores nothing.',
    inputSchema: { type: 'object', properties: { receipt_number: { type: 'string', description: 'Receipt number from the I-797 notice. Spaces and dashes are ignored.' }, lang: langProp }, required: ['receipt_number'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { receipt_number: { type: 'string' }, valid: { type: 'boolean' }, prefix: { type: ['string', 'null'] }, service_center: { type: ['string', 'null'] }, check_url: urlProp, source: { type: 'string' } }, required: ['receipt_number', 'valid', 'check_url'] },
    annotations: RO, icons: [ICON],
  },
  {
    name: 'explicar_estatus',
    title: 'Explain a USCIS case status / Explicar un estatus de USCIS',
    description: 'Explains in plain language what an official USCIS case status means and what to do next, tailored to a form when given (e.g. "Case Was Received" for I-485). Bilingual. Returns a canonical URL to cite.',
    inputSchema: { type: 'object', properties: { status: { type: 'string', description: 'Official USCIS status text, e.g. "Case Was Received", "Request for Additional Evidence Was Sent", "Card Was Mailed To Me". Case-insensitive.' }, form: { type: 'string', description: 'Optional form code, e.g. "I-485", "I-130", "N-400".' }, lang: langProp }, required: ['status'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { status: { type: 'string' }, title: { type: 'string' }, form: { type: ['string', 'null'] }, meaning: { type: 'string' }, next_steps: { type: 'array', items: { type: 'string' } }, typical_range: { type: ['string', 'null'] }, url: urlProp, source: { type: 'string' } }, required: ['status', 'meaning', 'url'] },
    annotations: RO, icons: [ICON],
  },
  {
    name: 'tiempo_tipico',
    title: 'Typical processing range / Tiempo típico',
    description: 'Returns the typical processing range published by USCIS for a form (never an exact date) and its usual milestones.',
    inputSchema: { type: 'object', properties: { form: { type: 'string', description: 'Form code, e.g. "I-130" or "N-400".' }, lang: langProp }, required: ['form'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { form: { type: 'string' }, name: { type: 'string' }, typical_range: { type: ['string', 'null'] }, milestones: { type: 'array', items: { type: 'string' } }, url: urlProp, official_url: urlProp, source: { type: 'string' } }, required: ['form', 'name', 'url'] },
    annotations: RO, icons: [ICON],
  },
  {
    name: 'buscar_formulario',
    title: 'Find a USCIS form / Buscar formulario',
    description: 'Finds USCIS forms by code or plain words in English or Spanish (e.g. "green card", "work permit", "permiso de trabajo", "ciudadanía").',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Form code or words.' }, lang: langProp }, required: ['query'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { form: { type: 'string' }, name: { type: 'string' }, short: { type: 'string' }, typical_range: { type: ['string', 'null'] }, url: urlProp } } }, source: { type: 'string' } }, required: ['results'] },
    annotations: RO, icons: [ICON],
  },
  {
    name: 'listar_estatus',
    title: 'List USCIS statuses / Listar estatus',
    description: 'Lists the official USCIS case statuses CaseAlerta explains, optionally filtered by stage (intake, biometrics, review, evidence, interview, decision, card, closed, admin) or by form.',
    inputSchema: { type: 'object', properties: { stage: { type: 'string', enum: ['intake', 'biometrics', 'review', 'evidence', 'interview', 'decision', 'card', 'closed', 'admin'] }, form: { type: 'string', description: 'Optional form code to keep only statuses that apply to it.' }, lang: langProp }, additionalProperties: false },
    outputSchema: { type: 'object', properties: { statuses: { type: 'array', items: { type: 'object', properties: { status: { type: 'string' }, title: { type: 'string' }, stage: { type: 'string' }, kind: { type: 'string' }, url: urlProp } } }, source: { type: 'string' } }, required: ['statuses'] },
    annotations: RO, icons: [ICON],
  },
  {
    name: 'buscar_guia',
    title: 'Find an immigration guide / Buscar guía',
    description: 'Searches CaseAlerta guides and USCIS news (biometrics, interviews, RFE, green card renewal, removing conditions, citizenship, fees) in English or Spanish.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Words, e.g. "biometrics", "I-751", "entrevista".' }, lang: langProp }, required: ['query'], additionalProperties: false },
    outputSchema: { type: 'object', properties: { results: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, summary: { type: 'string' }, date: { type: 'string' }, type: { type: 'string' }, url: urlProp } } }, source: { type: 'string' } }, required: ['results'] },
    annotations: RO, icons: [ICON],
  },
];
export const TOOL_NAMES = TOOLS.map((t) => t.name);

type Out = { text: string; data: Record<string, unknown>; isError?: boolean };
const langOf = (v: unknown): Lang => (v === 'es' ? 'es' : 'en');
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
const err = (text: string): Out => ({ isError: true, text, data: {} });

function analizar(a: any): Out {
  const lang = langOf(a?.lang);
  const r = cleanReceipt(a?.receipt_number);
  const valid = RECEIPT_RE.test(r);
  const prefix = /^[A-Z]{3}/.test(r) ? r.slice(0, 3) : null;
  const center = prefix ? CENTERS[prefix]?.[lang] ?? null : null;
  const check_url = `${SITE}${P[lang].home}#consulta`;
  const data = { receipt_number: r, valid, prefix, service_center: center, check_url, source: SOURCE };
  const es = lang === 'es';
  const text = valid
    ? `${r}: ${es ? 'formato válido' : 'valid format'}${center ? ` · ${center}` : ''}.\n${es ? 'Estatus en vivo y alertas' : 'Live status and alerts'}: ${check_url}`
    : `${r || '(empty)'}: ${es ? 'no es un recibo válido. Son 3 letras y 10 números, por ejemplo IOE0912345678 (viene en el aviso I-797C).' : 'not a valid receipt number. It is 3 letters + 10 digits, e.g. IOE0912345678 (printed on the I-797C notice).'}`;
  return { text, data };
}

const ALIAS: Record<string, string> = {
  rfe: 'Request for Additional Evidence Was Sent', 'request for evidence': 'Request for Additional Evidence Was Sent',
  biometrics: 'Fingerprint Fee Was Received', 'green card mailed': 'Card Was Mailed To Me', 'card mailed': 'Card Was Mailed To Me', approved: 'Case Was Approved',
};
/** Estatus exacto, alias común (RFE, NOID) o el estatus oficial que contiene todas las palabras dadas. */
export function findStatus(raw: string) {
  const exact = statusByCode(raw);
  if (exact) return exact;
  const q = norm(raw);
  if (ALIAS[q]) return statusByCode(ALIAS[q]);
  const words = q.split(/[^a-z0-9']+/).filter((w) => w.length > 2 && !['was', 'the', 'and', 'for', 'my', 'case'].includes(w));
  if (!words.length) return undefined;
  const hits = STATUSES.filter((x) => { const h = norm(`${x.code} ${x.title_es}`); return words.every((w) => h.includes(w)); });
  return hits.sort((x, y) => x.code.length - y.code.length)[0];
}

function explicar(a: any): Out {
  const lang = langOf(a?.lang);
  const st = findStatus(String(a?.status ?? ''));
  if (!st) return err(`Unknown status "${a?.status ?? ''}". Use the exact USCIS text or call listar_estatus. Catalog: ${SITE}/api/v1/statuses/`);
  const form = formByCode(a?.form);
  const useForm = form && applies(form, st) ? form : undefined;
  const url = `${SITE}${useForm ? w1Path(lang, useForm, st) : statusPath(lang, st)}`;
  const next_steps = pick(lang, st.next_es, st.next_en);
  const data = {
    status: st.code, title: lang === 'es' ? st.title_es : st.code, form: useForm?.code ?? null,
    meaning: (useForm && note(useForm, st, lang)) || pick(lang, st.meaning_es, st.meaning_en),
    next_steps, typical_range: useForm ? rangeText(lang, useForm) : null, url, source: SOURCE,
  };
  const es = lang === 'es';
  return { data, text: `${data.title}${data.form ? ` (${data.form})` : ''}\n\n${data.meaning}\n\n${es ? 'Qué sigue' : 'What to do next'}:\n${next_steps.map((x) => `- ${x}`).join('\n')}${data.typical_range ? `\n\n${es ? 'Rango típico' : 'Typical range'}: ${data.typical_range}` : ''}\n\n${url}\n${SOURCE}` };
}

function tiempo(a: any): Out {
  const lang = langOf(a?.lang);
  const f = formByCode(a?.form);
  if (!f) return err(`Unknown form code "${a?.form ?? ''}". Try buscar_formulario first.`);
  const url = `${SITE}${formPath(lang, f)}`;
  const milestones = pick(lang, f.milestones_es, f.milestones_en);
  const data = { form: f.code, name: fName(lang, f), typical_range: rangeText(lang, f), milestones, url, official_url: f.official_url, source: SOURCE };
  const es = lang === 'es';
  return { data, text: `${f.code} · ${data.name}\n${es ? 'Rango típico' : 'Typical range'}: ${data.typical_range ?? (es ? 'USCIS no publica un rango único' : 'USCIS does not publish a single range')}\n${milestones.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n${url}\n${SOURCE}` };
}

function buscar(a: any): Out {
  const lang = langOf(a?.lang);
  const q = norm(String(a?.query ?? ''));
  if (!q) return err('Empty query.');
  const words = q.split(/\s+/);
  const hits = FORMS.filter((f) => { const hay = norm([f.code, f.code.replace('-', ''), f.name_en, f.name_es, f.short_en, f.short_es, f.what_en, f.what_es].join(' ')); return words.every((w) => hay.includes(w)); })
    .slice(0, 8).map((f) => ({ form: f.code, name: fName(lang, f), short: fShort(lang, f), typical_range: rangeText(lang, f), url: `${SITE}${formPath(lang, f)}` }));
  return { data: { results: hits, source: SOURCE }, text: hits.length ? hits.map((h) => `${h.form} · ${h.short}${h.typical_range ? ` (${h.typical_range})` : ''} — ${h.url}`).join('\n') : (lang === 'es' ? 'Sin resultados. Prueba con el código del formulario (I-485) o con otra palabra.' : 'No results. Try the form code (I-485) or other words.') };
}

function listar(a: any): Out {
  const lang = langOf(a?.lang);
  const form = a?.form ? formByCode(a.form) : undefined;
  if (a?.form && !form) return err(`Unknown form code "${a.form}". Try buscar_formulario first.`);
  const list = STATUSES.filter((s) => (!a?.stage || s.stage === a.stage) && (!form || applies(form, s)))
    .map((s) => ({ status: s.code, title: lang === 'es' ? s.title_es : s.code, stage: s.stage, kind: s.kind, url: `${SITE}${form ? w1Path(lang, form, s) : statusPath(lang, s)}` }));
  return { data: { statuses: list, source: SOURCE }, text: list.map((s) => `${s.title} [${s.stage}] — ${s.url}`).join('\n') || (lang === 'es' ? 'Sin resultados.' : 'No results.') };
}

function guia(a: any): Out {
  const lang = langOf(a?.lang);
  const q = norm(String(a?.query ?? ''));
  if (!q) return err('Empty query.');
  const words = q.split(/\s+/);
  const hits = NEWS.filter((n) => { const hay = norm([n.title_en, n.title_es, n.desc_en, n.desc_es, ...n.body_en, ...n.body_es].join(' ')); return words.every((w) => hay.includes(w)); })
    .slice(0, 6).map((n) => ({ title: lang === 'es' ? n.title_es : n.title_en, summary: lang === 'es' ? n.desc_es : n.desc_en, date: n.updated ?? n.date, type: n.type, url: `${SITE}${newsPath(lang, n)}` }));
  return { data: { results: hits, source: SOURCE }, text: hits.length ? hits.map((h) => `${h.title} (${h.date}) — ${h.url}\n${h.summary}`).join('\n\n') : (lang === 'es' ? 'Sin guías para esa búsqueda.' : 'No guides for that search.') };
}

const FNS: Record<string, (a: any) => Out> = { analizar_recibo: analizar, explicar_estatus: explicar, tiempo_tipico: tiempo, buscar_formulario: buscar, listar_estatus: listar, buscar_guia: guia };

export function callTool(name: string, args: unknown) {
  const fn = FNS[name];
  if (!fn) return null;
  const out = fn(args ?? {});
  return out.isError
    ? { content: [{ type: 'text', text: out.text }], isError: true }
    : { content: [{ type: 'text', text: out.text }], structuredContent: out.data, isError: false };
}

// ---------- Recursos y prompts ----------
export const RESOURCES = [
  { uri: `${SITE}/api/v1/statuses/`, name: 'statuses', title: 'USCIS statuses explained (EN/ES)', description: 'Every official USCIS case status with meaning, next steps, common mistakes and typical wait, in English and Spanish.', mimeType: 'application/json', icons: [ICON] },
  { uri: 'casealerta://forms', name: 'forms', title: 'USCIS forms catalog (EN/ES)', description: 'USCIS forms with plain-language names, usual milestones and typical processing ranges.', mimeType: 'application/json', icons: [ICON] },
  { uri: `${SITE}/llms.txt`, name: 'llms.txt', title: 'CaseAlerta llms.txt', description: 'Index of CaseAlerta pages and agent endpoints.', mimeType: 'text/markdown', icons: [ICON] },
];
export const RESOURCE_TEMPLATES = [
  { uriTemplate: 'casealerta://status/{lang}/{status}', name: 'status', title: 'One USCIS status explained', description: 'A single status explanation. lang = en | es; status = exact USCIS text, URL-encoded.', mimeType: 'application/json' },
];

export function readResource(uri: string, llms: () => string) {
  if (uri === RESOURCES[0].uri) return { uri, mimeType: 'application/json', text: JSON.stringify({ source: SOURCE, statuses: STATUSES }) };
  if (uri === RESOURCES[1].uri) return { uri, mimeType: 'application/json', text: JSON.stringify({ source: SOURCE, forms: FORMS.map(({ code, name_en, name_es, short_en, short_es, milestones_en, milestones_es, typical_months_min, typical_months_max, official_url, slug }) => ({ code, name_en, name_es, short_en, short_es, milestones_en, milestones_es, typical_months_min, typical_months_max, official_url, url_en: `${SITE}/form/${slug}/`, url_es: `${SITE}/formulario/${slug}/` })) }) };
  if (uri === RESOURCES[2].uri) return { uri, mimeType: 'text/markdown', text: llms() };
  const m = /^casealerta:\/\/status\/(en|es)\/(.+)$/.exec(uri);
  if (m) { const o = explicar({ lang: m[1], status: decodeURIComponent(m[2]) }); if (!o.isError) return { uri, mimeType: 'application/json', text: JSON.stringify(o.data) }; }
  return null;
}

export const PROMPTS = [
  {
    name: 'explicar_mi_caso', title: 'Explain my USCIS case / Explícame mi caso',
    description: 'Explains a USCIS case status for a form in simple words, with next steps and the typical range.',
    arguments: [{ name: 'status', description: 'Official USCIS status text', required: true }, { name: 'form', description: 'Form code, e.g. I-485', required: false }, { name: 'lang', description: 'en or es', required: false }],
  },
];
export function getPrompt(name: string, args: Record<string, string> | undefined) {
  if (name !== 'explicar_mi_caso' || !args?.status) return null;
  const es = args.lang === 'es';
  const text = es
    ? `Mi caso de USCIS dice "${args.status}"${args.form ? ` y es un ${args.form}` : ''}. Usa la herramienta explicar_estatus (lang "es") y tiempo_tipico para explicarme en palabras sencillas qué significa, qué sigue y cuánto suele tardar. Cita la liga de CaseAlerta y aclara que no es asesoría legal.`
    : `My USCIS case says "${args.status}"${args.form ? ` and it is an ${args.form}` : ''}. Use the explicar_estatus tool (lang "en") and tiempo_tipico to explain in simple words what it means, what happens next and how long it usually takes. Cite the CaseAlerta link and note it is not legal advice.`;
  return { description: PROMPTS[0].description, messages: [{ role: 'user', content: { type: 'text', text } }] };
}

// ---------- Tarjeta del servidor y catálogo de IA ----------
export const SERVER_CARD = {
  $schema: 'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
  name: SERVER_NAME,
  version: SERVER_VERSION,
  description: 'Bilingual (EN/ES) USCIS case status explanations, forms and typical processing ranges.',
  title: 'CaseAlerta — USCIS case status explained',
  websiteUrl: SITE,
  icons: [ICON],
  remotes: [{ type: 'streamable-http', url: MCP_URL, supportedProtocolVersions: SUPPORTED }],
};

export const AI_CATALOG = {
  specVersion: '1.0',
  host: { displayName: 'CaseAlerta · VARGER Group LLC', identifier: 'casealerta.com', documentationUrl: `${SITE}/llms.txt`, logoUrl: `${SITE}/sello.png` },
  entries: [
    { identifier: 'urn:air:casealerta.com:mcp:casealerta', type: 'application/mcp-server-card+json', url: CARD_URL },
    { identifier: 'urn:air:casealerta.com:skill:casealerta', type: 'application/agent-skills+md', displayName: 'CaseAlerta — answer USCIS case status questions', description: 'How an agent should explain USCIS case statuses, forms and typical ranges with CaseAlerta.', tags: ['uscis', 'immigration', 'case status', 'green card', 'bilingual'], url: `${SITE}/skills/casealerta/SKILL.md` },
    { identifier: 'urn:air:casealerta.com:openapi:v1', type: 'application/vnd.oai.openapi+json', displayName: 'CaseAlerta citable API', description: 'REST API: what a USCIS status means and the full status catalog (EN/ES).', tags: ['uscis', 'api'], url: `${SITE}/openapi.json` },
  ],
};
