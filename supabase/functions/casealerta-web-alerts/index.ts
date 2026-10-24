// CaseAlerta · YUNQUE · alertas desde la web (casealerta.com)
// POST {action:'subscribe', email, lang, case:{receipt_number, form_type, status_en, submitted, modified, history}}  (Authorization: JWT del usuario, anónimo o no)
//   → guarda el caso del usuario, manda correo de confirmación (doble opt-in) por Resend.
// GET ?confirm=<token>  → confirma el correo: lo pega al usuario (o mueve el caso a la cuenta que ya usa ese correo) y redirige a casealerta.com
// GET ?unsub=<token>    → apaga avisos por correo de ese usuario
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const URL_ = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(URL_, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const SITE = "https://casealerta.com";
const FN = `${URL_}/functions/v1/casealerta-web-alerts`;
const FROM = Deno.env.get("CASEALERTA_FROM") ?? "CaseAlerta <alertas@casealerta.com>";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const redirect = (to: string) => new Response(null, { status: 302, headers: { Location: to } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[A-Za-z]{2,}$/;
const RECEIPT_RE = /^[A-Z]{3}[0-9]{10}$/;

async function resendKey() {
  const env = Deno.env.get("RESEND_API_KEY");
  if (env) return env;
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'casealerta_resend_key' limit 1`;
  return r[0]?.decrypted_secret ?? null;
}

function usDate(s?: string | null) {
  if (!s) return null;
  const m = /^(\d{2})-(\d{2})-(\d{4})/.exec(s);
  if (m) return `${m[3]}-${m[1]}-${m[2]}`;
  const d = new Date(s);
  return isNaN(+d) ? null : d.toISOString().slice(0, 10);
}

function confirmHtml(lang: string, receipt: string, link: string) {
  const es = lang === "es";
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#F3F6FB;font-family:Arial,Helvetica,sans-serif;color:#0F2A5C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden">
<tr><td style="background:#1F4FA0;padding:18px 22px"><img src="${SITE}/sello.png" width="48" height="48" alt="CaseAlerta" style="vertical-align:middle;background:#fff;border-radius:50%;border:3px solid #D4A84B">
<span style="color:#fff;font:bold 20px Georgia,serif;letter-spacing:1px;vertical-align:middle;margin-left:10px">CASEALERTA</span></td></tr>
<tr><td style="padding:24px 22px"><h1 style="margin:0 0 12px;font-size:22px">${es ? "Confirma tu correo" : "Confirm your email"}</h1>
<p style="margin:0 0 18px;font-size:16px;line-height:1.5">${es ? `Toca el botón para recibir un aviso cada vez que cambie tu caso <b>${esc(receipt)}</b>. Solo te escribimos sobre tu caso. Sin anuncios.` : `Tap the button to get an alert every time your case <b>${esc(receipt)}</b> changes. We only write about your case. No ads.`}</p>
<a href="${link}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;font-weight:bold;padding:14px 20px;border-radius:12px;font-size:16px">${es ? "Sí, avísame" : "Yes, alert me"}</a>
<p style="margin:18px 0 0;font-size:12px;color:#5B6478">${es ? "Si no pediste esto, ignora este correo y no te escribiremos." : "If you did not ask for this, ignore this email and we will not write again."}</p></td></tr></table></td></tr></table></body></html>`;
}

async function subscribe(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error: ue } = await admin.auth.getUser(jwt);
  if (ue || !u?.user) return json({ code: "unauthorized" }, 401);
  const uid = u.user.id;
  const b = await req.json().catch(() => ({}));
  const email = String(b.email ?? "").trim().toLowerCase();
  const lang = b.lang === "en" ? "en" : "es";
  const c = b.case ?? {};
  const receipt = String(c.receipt_number ?? "").toUpperCase();
  if (!EMAIL_RE.test(email)) return json({ code: "invalid_email", message: lang === "es" ? "Revisa tu correo." : "Check your email." }, 400);
  if (!RECEIPT_RE.test(receipt)) return json({ code: "invalid_receipt" }, 400);
  // límite simple: 5 altas por usuario por día
  const [{ n }] = await sql`select count(*)::int n from casealerta.web_alert_signups where owner_id = ${uid} and created_at > now() - interval '1 day'`;
  if (n >= 5) return json({ code: "rate_limited" }, 429);

  // Los avisos son de Pro: sin plan vigente no se guarda nada ni se manda correo de confirmación.
  const [{ plan: anyPlan }] = await sql`select casealerta.active_plan(${uid}) as plan`;
  if (!anyPlan) return json({ code: "plan_limit", plan: "free", limit: 0, used: 0,
    message: lang === "es" ? "Los avisos cuando cambia tu caso son de Pro." : "Alerts when your case changes are part of Pro." }, 402);

  const status = c.status_en ?? null;
  const existing = await sql`select id from casealerta.cases where owner_id = ${uid} and receipt_number = ${receipt} limit 1`;
  let caseId = existing[0]?.id;
  if (!caseId) {
    // Límite por plan (plan maestro §4.1): Gratis 1 caso · Pro 5 · Familia 15. El plan sale de casealerta.subscriptions (Stripe o RevenueCat).
    const [{ plan }] = await sql`select casealerta.active_plan(${uid}) as plan`;
    const limit = plan === "family" ? 15 : plan === "pro" ? 5 : 0; // gratis: los avisos son de Pro
    const [{ used }] = await sql`select count(*)::int used from casealerta.cases where owner_id = ${uid} and org_id is null and coalesce(active, true)`;
    if (used >= limit) {
      return json({ code: "plan_limit", plan: plan ?? "free", limit, used,
        message: !plan ? (lang === "es" ? "Los avisos cuando cambia tu caso son de Pro." : "Alerts when your case changes are part of Pro.")
        : lang === "es" ? `Tu plan ${plan === "family" ? "Familia" : "Pro"} vigila ${limit} casos. Sube de plan para vigilar este también.` : `Your ${plan === "family" ? "Family" : "Pro"} plan watches ${limit} cases. Upgrade to watch this one too.` }, 402);
    }
    const mod = usDate(c.modified);
    const ins = await sql`insert into casealerta.cases (owner_id, receipt_number, form_type, last_status_code, last_status_text, last_status_date, received_date, last_checked_at, last_changed_at)
      values (${uid}, ${receipt}, ${c.form_type ?? null}, ${status}, ${status}, ${mod}, ${usDate(c.submitted)}, now(), ${mod ? `${mod}T12:00:00Z` : new Date().toISOString()})
      returning id`;
    caseId = ins[0].id;
    const hist = Array.isArray(c.history) ? c.history.filter((h: any) => h?.date).slice(0, 40) : [];
    for (const h of hist) {
      const t = h.completed_text_en ?? status;
      // la historia ya ocurrió: se marca como notificada para no disparar avisos viejos
      const ev = await sql`insert into casealerta.case_events (case_id, owner_id, status_code, status_text, status_date, source, detected_at)
        values (${caseId}, ${uid}, ${t}, ${t}, ${usDate(h.date)}, 'uscis_api', now() - interval '3 days') returning id`;
      void ev;
    }
  }
  await sql`insert into casealerta.profiles (owner_id, lang, email_enabled) values (${uid}, ${lang}::casealerta.lang, true)
    on conflict (owner_id) do update set lang = excluded.lang, email_enabled = true`;
  const [row] = await sql`insert into casealerta.web_alert_signups (owner_id, email, lang, receipt_number) values (${uid}, ${email}, ${lang}::casealerta.lang, ${receipt}) returning token`;
  const key = await resendKey();
  if (!key) return json({ ok: true, case_id: caseId, email_sent: false });
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: email, subject: lang === "es" ? "Confirma tus avisos de CaseAlerta" : "Confirm your CaseAlerta alerts",
      html: confirmHtml(lang, receipt, `${FN}?confirm=${row.token}`) }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
  return json({ ok: true, case_id: caseId, email_sent: r.ok });
}

async function confirm(token: string) {
  const rows = await sql`select * from casealerta.web_alert_signups where token = ${token} limit 1`;
  const s = rows[0];
  if (!s) return redirect(`${SITE}/?alertas=error`);
  const home = s.lang === "en" ? `${SITE}/en/` : `${SITE}/`;
  if (s.confirmed_at) return redirect(`${home}?alertas=ok`);
  const other = await sql`select id from auth.users where lower(email) = ${s.email} and id <> ${s.owner_id} limit 1`;
  if (other[0]) {
    // el correo ya tiene cuenta (por ejemplo, la app): el caso se mueve ahí, sin duplicar
    const to = other[0].id;
    await sql`update casealerta.cases c set owner_id = ${to} where owner_id = ${s.owner_id}
      and not exists (select 1 from casealerta.cases x where x.owner_id = ${to} and x.receipt_number = c.receipt_number)`;
    await sql`update casealerta.case_events set owner_id = ${to} where owner_id = ${s.owner_id} and case_id in (select id from casealerta.cases where owner_id = ${to})`;
    await sql`insert into casealerta.profiles (owner_id, lang, email_enabled) values (${to}, ${s.lang}, true) on conflict (owner_id) do update set email_enabled = true`;
    await sql`update casealerta.web_alert_signups set confirmed_at = now(), merged_into = ${to} where token = ${token}`;
  } else {
    const { error } = await admin.auth.admin.updateUserById(s.owner_id, { email: s.email, email_confirm: true });
    if (error) { console.error(error); return redirect(`${home}?alertas=error`); }
    await sql`update casealerta.web_alert_signups set confirmed_at = now() where token = ${token}`;
  }
  return redirect(`${home}?alertas=ok`);
}

async function unsub(token: string) {
  const rows = await sql`select owner_id, merged_into, lang from casealerta.web_alert_signups where token = ${token} limit 1`;
  const s = rows[0];
  if (s) await sql`update casealerta.profiles set email_enabled = false where owner_id = ${s.merged_into ?? s.owner_id}`;
  return redirect(`${s?.lang === "en" ? `${SITE}/en/` : `${SITE}/`}?alertas=off`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const u = new URL(req.url);
  const uuid = /^[0-9a-f-]{36}$/i;
  if (req.method === "GET") {
    const c = u.searchParams.get("confirm"), x = u.searchParams.get("unsub");
    if (c && uuid.test(c)) return confirm(c);
    if (x && uuid.test(x)) return unsub(x);
    return redirect(SITE);
  }
  if (req.method !== "POST") return json({ code: "method_not_allowed" }, 405);
  try { return await subscribe(req); } catch (e) { console.error(e); return json({ code: "server_error" }, 500); }
});
