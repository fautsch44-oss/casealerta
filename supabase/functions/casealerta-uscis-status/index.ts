// CaseAlerta · YUNQUE · consulta de estatus USCIS (Torch Case Status API)
// Modos:
//  POST {"receipt_number":"EAC9999103403"}              -> consulta puntual (web gratis / app)
//  POST {"mode":"poll","limit":50}  (x-cron-key o Bearer service role) -> revisa casos activos y registra cambios
//  POST {"mode":"sandbox_traffic"}                       -> tráfico diario de prueba con recibos staging (solo sandbox)
//  POST {"mode":"demo_check"}  (x-cron-key o service role) -> casos de prueba del demo USCIS: éxito, 404, 400 y estado del demo_id
// Demo USCIS (producción): si existe CASEALERTA_USCIS_DEMO_ID se manda el encabezado `demo_id: ####` en cada llamada.
// Caché: cada respuesta 200 se guarda en casealerta.uscis_cache. Si USCIS no responde (5xx/429, p. ej. el sandbox
// cerrado en fin de semana), se devuelve la ÚLTIMA respuesta oficial con stale=true y cached_at — nunca un dato inventado.
// Errores: se normalizan al formato RFC 9457 de USCIS (code, message, category, reference, status, traceId),
// se registran en el log del backend y se devuelven a la app/web con un mensaje claro en ES/EN.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.4";

const BASE = Deno.env.get("CASEALERTA_USCIS_BASE") ?? "https://api-int.uscis.gov/case-status";
const TOKEN_URL = Deno.env.get("CASEALERTA_USCIS_TOKEN_URL") ?? "https://api-int.uscis.gov/oauth/accesstoken";
const CLIENT_ID = Deno.env.get("CASEALERTA_USCIS_CLIENT_ID");
const CLIENT_SECRET = Deno.env.get("CASEALERTA_USCIS_CLIENT_SECRET");
const DEMO_ID = (Deno.env.get("CASEALERTA_USCIS_DEMO_ID") ?? "").trim();
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const IS_SANDBOX = BASE.includes("api-int.uscis.gov");

const STAGING = ["EAC9999103403","EAC9999103404","EAC9999103405","EAC9999103410","EAC9999103411","EAC9999103416","EAC9999103419",
  "LIN9999106498","LIN9999106499","LIN9999106504","LIN9999106505","LIN9999106506","SRC9999102777","SRC9999102778","SRC9999132710",
  "SRC9999132719","EAC9999103400","EAC9999103402","EAC9999103406","LIN9999106501","LIN9999106507","SRC9999132694","SRC9999132706"];
const NOT_FOUND = ["EAC0000000001", "LIN0000000002"];

const RECEIPT_RE = /^([A-Za-z]{3}[0-9]{10}|[A-Za-z]{3}\*[0-9]{9})$/;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// "09-05-2023 14:28:46" (MM-DD-YYYY, formato USCIS) | ISO -> "2023-09-05" (fecha calendario para FECHAS CLAVE)
const toDate = (v: string | null | undefined): string | null => {
  if (!v) return null;
  const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const u = String(v).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/); if (u) return `${u[3]}-${u[1].padStart(2, "0")}-${u[2].padStart(2, "0")}`;
  const d = new Date(v); return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

async function vaultSecret(name: string): Promise<string | null> {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name} limit 1`;
  return r[0]?.decrypted_secret ?? null;
}

// ── Errores USCIS (RFC 9457) ──────────────────────────────────────────────────────────────
type UscisError = { code: string | null; message: string | null; category: string | null; reference: string | null; status: number; traceId: string | null };
function normalizeError(status: number, body: any): UscisError {
  const e = Array.isArray(body?.errors) ? body.errors[0] ?? {} : body?.error && typeof body.error === "object" ? body.error : body ?? {};
  return {
    code: e.code != null ? String(e.code) : null,
    message: e.message ?? e.detail ?? e.title ?? (typeof body?.error === "string" ? body.error : null) ?? body?.error_description ?? null,
    category: e.category ?? null,
    reference: e.reference ?? e.instance ?? null,
    status: Number(e.status ?? status) || status,
    traceId: e.traceId ?? e.trace_id ?? body?.traceId ?? null,
  };
}
const FRIENDLY: Record<string, { en: string; es: string }> = {
  "400": { en: "Check the receipt number: 3 letters and 10 digits.", es: "Revisa el número de recibo: 3 letras y 10 números." },
  "401": { en: "We couldn't connect to USCIS right now. Try again in a few minutes.", es: "No pudimos conectar con USCIS ahora. Intenta en unos minutos." },
  "403": { en: "We couldn't connect to USCIS right now. Try again in a few minutes.", es: "No pudimos conectar con USCIS ahora. Intenta en unos minutos." },
  "404": { en: "USCIS didn't find that receipt. Check the letters and numbers.", es: "USCIS no encontró ese recibo. Revisa las letras y los números." },
  "422": { en: "USCIS couldn't read that receipt. Check the letters and numbers.", es: "USCIS no pudo leer ese recibo. Revisa las letras y los números." },
  "429": { en: "Too many checks right now. Try again in a minute.", es: "Muchas consultas en este momento. Intenta en un minuto." },
  "5xx": { en: "USCIS isn't responding right now. Try again in a few minutes.", es: "USCIS no responde ahora. Intenta en unos minutos." },
};
const friendly = (s: number) => FRIENDLY[String(s)] ?? (s >= 500 ? FRIENDLY["5xx"] : FRIENDLY["5xx"]);

// ── Token OAuth 2.0 (Client Credentials, solo en el backend) ──────────────────────────────
let token: { value: string; exp: number } | null = null;
async function getToken(force = false): Promise<string> {
  if (!force && token && Date.now() < token.exp) return token.value;
  if (!CLIENT_ID || !CLIENT_SECRET) throw { status: 503, code: "credentials_missing", message: "USCIS credentials not configured" };
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", ...(DEMO_ID ? { demo_id: DEMO_ID } : {}) },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  });
  if (!r.ok) {
    const err = normalizeError(r.status, await r.json().catch(() => ({})));
    console.error("uscis_token_error", JSON.stringify(err));
    throw { status: 502, code: "token_error", message: `USCIS token ${r.status}`, uscis: err };
  }
  const j = await r.json();
  const ttl = Number(j.expires_in ?? 1799) * 1000;
  token = { value: j.access_token, exp: Date.now() + Math.max(ttl - 120000, 60000) };
  return token.value;
}

type Status = {
  receipt_number: string; form_type: string | null; status_en: string | null; status_es: string | null;
  desc_en: string | null; desc_es: string | null; submitted: string | null; modified: string | null; history: unknown[];
};
type Lookup = { ok: true; data: Status } | { ok: false; status: number; error: UscisError };

async function callUscis(receipt: string, t: string) {
  const headers: Record<string, string> = { Authorization: `Bearer ${t}`, Accept: "application/json" };
  if (DEMO_ID) headers.demo_id = DEMO_ID;
  return await fetch(`${BASE}/${encodeURIComponent(receipt)}`, { headers });
}

async function lookup(receipt: string, tag = "uscis_case_status"): Promise<Lookup> {
  let r = await callUscis(receipt, await getToken());
  // 401: el token venció antes de tiempo → uno nuevo y un solo reintento.
  if (r.status === 401) r = await callUscis(receipt, await getToken(true));
  // 429/503: un reintento corto respetando Retry-After (máx. 2 s) para no castigar al usuario.
  if (r.status === 429 || r.status === 503) {
    const wait = Math.min(Number(r.headers.get("Retry-After") ?? 1) * 1000, 2000);
    await sleep(isNaN(wait) ? 1000 : wait);
    r = await callUscis(receipt, await getToken());
  }
  await sql`insert into casealerta.api_usage (endpoint, units, billable, client_id) values (${tag}, 1, false, ${String(r.status)})`;
  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = normalizeError(r.status, body);
    console.error("uscis_api_error", JSON.stringify({ receipt_prefix: receipt.slice(0, 3), ...err }));
    return { ok: false, status: r.status, error: err };
  }
  const c = body.case_status ?? {};
  const data: Status = {
    receipt_number: c.receiptNumber ?? receipt, form_type: c.formType ?? null,
    status_en: c.current_case_status_text_en ?? null, status_es: c.current_case_status_text_es ?? null,
    desc_en: c.current_case_status_desc_en ?? null, desc_es: c.current_case_status_desc_es ?? null,
    submitted: c.submittedDate ?? null, modified: c.modifiedDate ?? null, history: c.hist_case_status ?? [],
  };
  try {
    await sql`insert into casealerta.uscis_cache (receipt_number, payload, fetched_at) values (${receipt}, ${sql.json(data as any)}, now())
              on conflict (receipt_number) do update set payload = excluded.payload, fetched_at = now()`;
  } catch (_e) { /* la caché nunca rompe la consulta */ }
  return { ok: true, data };
}

async function cached(receipt: string): Promise<{ data: Status; at: string } | null> {
  try {
    const r = await sql`select payload, fetched_at from casealerta.uscis_cache where receipt_number = ${receipt} limit 1`;
    return r[0] ? { data: r[0].payload as Status, at: new Date(r[0].fetched_at).toISOString() } : null;
  } catch (_e) { return null; }
}

async function sandboxTraffic() {
  if (!IS_SANDBOX) return { skipped: "not sandbox" };
  const counts: Record<string, number> = {};
  for (const r of [...STAGING, ...NOT_FOUND]) {
    try { const res = await lookup(r, "uscis_sandbox_traffic"); const k = res.ok ? "200" : String(res.status); counts[k] = (counts[k] ?? 0) + 1; }
    catch (_e) { counts.error = (counts.error ?? 0) + 1; }
    await sleep(250);
  }
  return { calls: STAGING.length + NOT_FOUND.length, by_status: counts };
}

// Guion del demo: un éxito, un no encontrado y un recibo mal escrito (validación local, sin llamar a USCIS).
async function demoCheck() {
  const out: Record<string, unknown> = { environment: IS_SANDBOX ? "sandbox" : "production", demo_id_header: DEMO_ID ? `set (${DEMO_ID.length} digits)` : "not set" };
  const ok = await lookup(IS_SANDBOX ? "EAC9999103403" : (await vaultSecret("casealerta_demo_receipt")) ?? "EAC9999103403", "uscis_demo_check");
  out.success = ok.ok ? { status: 200, form: ok.data.form_type, text: ok.data.status_en } : { status: ok.status, error: ok.error };
  const nf = await lookup("EAC0000000001", "uscis_demo_check");
  out.not_found = nf.ok ? { status: 200 } : { status: nf.status, error: nf.error, shown_es: friendly(nf.status).es };
  out.invalid_local = { status: 400, shown_es: FRIENDLY["400"].es };
  return out;
}

async function poll(limit: number) {
  const cases = await sql`select id, owner_id, receipt_number, last_status_text from casealerta.cases
    where active and (last_checked_at is null or last_checked_at < now() - interval '20 hours')
    order by last_checked_at nulls first limit ${limit}`;
  let changed = 0, checked = 0, errors = 0;
  for (const c of cases) {
    try {
      const res = await lookup(c.receipt_number);
      checked++;
      if (!res.ok) { errors++; await sql`update casealerta.cases set last_checked_at = now() where id = ${c.id}`; continue; }
      const s = res.data;
      const received = toDate(s.submitted);
      const modified = toDate(s.modified);
      if (s.status_en && s.status_en !== c.last_status_text) {
        changed++;
        await sql.begin(async (tx) => {
          await tx`insert into casealerta.case_events (case_id, owner_id, status_code, status_text, status_date, source)
                   values (${c.id}, ${c.owner_id}, ${s.status_en}, ${s.status_en}, ${modified}, 'uscis_api')`;
          await tx`update casealerta.cases set form_type = coalesce(form_type, ${s.form_type}), last_status_code = ${s.status_en},
                   last_status_text = ${s.status_en}, last_status_date = coalesce(${modified}::date, last_status_date),
                   received_date = coalesce(received_date, ${received}::date),
                   last_checked_at = now(), last_changed_at = now() where id = ${c.id}`;
        });
      } else {
        await sql`update casealerta.cases set last_checked_at = now(), form_type = coalesce(form_type, ${s.form_type}),
                  received_date = coalesce(received_date, ${received}::date),
                  last_status_text = coalesce(last_status_text, ${s.status_en}), last_status_code = coalesce(last_status_code, ${s.status_en}),
                  last_status_date = coalesce(last_status_date, ${modified}::date) where id = ${c.id}`;
      }
      await sleep(220);
    } catch (_e) { errors++; }
  }
  return { checked, changed, errors };
}

async function isTrusted(req: Request) {
  const auth = req.headers.get("Authorization") ?? "";
  const cronKey = req.headers.get("x-cron-key");
  const okService = !!SERVICE_KEY && auth === `Bearer ${SERVICE_KEY}`;
  const okCron = !!cronKey && cronKey === (await vaultSecret("casealerta_cron_key"));
  return okService || okCron;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ code: "method_not_allowed", message: "Use POST" }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    if (body.mode === "sandbox_traffic") return json(await sandboxTraffic());
    if (body.mode === "poll") {
      if (!(await isTrusted(req))) return json({ code: "forbidden", message: "Cron key required" }, 403);
      return json(await poll(Math.min(Number(body.limit ?? 50), 200)));
    }
    if (body.mode === "demo_check") {
      if (!(await isTrusted(req))) return json({ code: "forbidden", message: "Cron key required" }, 403);
      return json(await demoCheck());
    }
    const receipt = String(body.receipt_number ?? "").trim().replace(/[-\s]/g, "").toUpperCase();
    if (!RECEIPT_RE.test(receipt)) {
      return json({ code: "invalid_receipt", message: FRIENDLY["400"].en, message_es: FRIENDLY["400"].es }, 400);
    }
    let res: Lookup;
    try { res = await lookup(receipt); }
    catch (e: any) {
      const hit = await cached(receipt);
      if (hit) return json({ ok: true, case: hit.data, stale: true, cached_at: hit.at, uscis_message: e?.uscis?.message ?? null,
        disclaimer: "Last official USCIS response (USCIS is not responding right now). Not legal advice." });
      throw e;
    }
    if (!res.ok && (res.status >= 500 || res.status === 429)) {
      const hit = await cached(receipt);
      if (hit) return json({ ok: true, case: hit.data, stale: true, cached_at: hit.at, uscis_message: res.error.message,
        disclaimer: "Last official USCIS response (USCIS is not responding right now). Not legal advice." });
    }
    if (!res.ok) {
      const f = friendly(res.status);
      return json({
        code: "uscis_error", upstream_status: res.status, message: f.en, message_es: f.es,
        uscis: res.error, uscis_message: res.error.message, trace_id: res.error.traceId,
      }, res.status >= 500 ? 502 : res.status);
    }
    return json({ ok: true, case: res.data, disclaimer: "Official USCIS status. Not legal advice." });
  } catch (e: any) {
    console.error("casealerta_uscis_internal", JSON.stringify({ code: e?.code, message: e?.message, uscis: e?.uscis }));
    const f = friendly(Number(e?.status ?? 500));
    return json({ code: e?.code ?? "internal", message: f.en, message_es: f.es, uscis: e?.uscis ?? null, uscis_message: e?.uscis?.message ?? null }, e?.status ?? 500);
  }
});
