// CaseAlerta · CANDADO · cuenta con código al correo (cuenta perezosa)
// La persona entra anónima. Cuando paga o quiere usar su plan en otro aparato, escribe su correo y recibe un código de 6 dígitos.
//  POST {action:'send_code', email, lang}            (JWT del usuario actual, anónimo o no)
//  POST {action:'verify', email, code}               → { ok, mode:'linked' } el correo se pega a esta sesión
//                                                     → { ok, mode:'switch', token_hash } ya existía una cuenta con ese correo:
//                                                       sus casos de esta sesión se pasan a esa cuenta y el cliente cambia de sesión
//                                                       con supabase.auth.verifyOtp({ token_hash, type: 'magiclink' })
// Códigos: 10 minutos, 5 intentos, máximo 5 envíos por correo por hora. Solo se guarda el hash.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const FROM = Deno.env.get("CASEALERTA_FROM") ?? "CaseAlerta <alertas@casealerta.com>";
const SITE = "https://casealerta.com";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[A-Za-z]{2,}$/;

async function hash(s: string) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(b)).map((x) => x.toString(16).padStart(2, "0")).join("");
}
async function resendKey() {
  const env = Deno.env.get("RESEND_API_KEY");
  if (env) return env;
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'casealerta_resend_key' limit 1`;
  return r[0]?.decrypted_secret ?? null;
}
function codeHtml(es: boolean, code: string) {
  return `<!doctype html><html lang="${es ? "es" : "en"}"><body style="margin:0;background:#F3F6FB;font-family:Arial,Helvetica,sans-serif;color:#0F2A5C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:18px;overflow:hidden">
<tr><td style="background:#1F4FA0;padding:18px 22px"><img src="${SITE}/sello.png" width="44" height="44" alt="CaseAlerta" style="vertical-align:middle;background:#fff;border-radius:50%;border:3px solid #D4A84B">
<span style="color:#fff;font:bold 20px Georgia,serif;letter-spacing:1px;vertical-align:middle;margin-left:10px">CASEALERTA</span></td></tr>
<tr><td style="padding:24px 22px"><h1 style="margin:0 0 10px;font-size:22px">${es ? "Tu código para entrar" : "Your sign-in code"}</h1>
<p style="margin:0 0 16px;font-size:16px">${es ? "Escribe este código en CaseAlerta. Vence en 10 minutos." : "Enter this code in CaseAlerta. It expires in 10 minutes."}</p>
<p style="margin:0 0 18px;font:bold 34px/1 'Courier New',monospace;letter-spacing:8px;background:#F3F6FB;border-radius:12px;padding:14px 16px;text-align:center">${code}</p>
<p style="margin:0;font-size:12px;color:#5B6478">${es ? "Si no pediste este código, ignora este correo. Nadie puede entrar sin él." : "If you did not ask for this code, ignore this email. No one can sign in without it."}</p></td></tr></table></td></tr></table></body></html>`;
}

async function uidFrom(req: Request) {
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(jwt);
  return error || !data?.user ? null : data.user;
}

async function sendCode(req: Request, b: any) {
  const me = await uidFrom(req);
  if (!me) return json({ code: "unauthorized" }, 401);
  const email = String(b.email ?? "").trim().toLowerCase();
  const es = b.lang !== "en";
  if (!EMAIL_RE.test(email)) return json({ code: "invalid_email", message: es ? "Revisa tu correo." : "Check your email." }, 400);
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
  const [{ n }] = await sql`select count(*)::int n from casealerta.login_codes where (email = ${email} or requested_by = ${me.id}) and created_at > now() - interval '1 hour'`;
  if (n >= 5) return json({ code: "rate_limited", message: es ? "Pediste muchos códigos. Espera unos minutos." : "Too many codes requested. Wait a few minutes." }, 429);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, "0");
  await sql`insert into casealerta.login_codes (email, code_hash, requested_by, ip, expires_at) values (${email}, ${await hash(`${email}:${code}`)}, ${me.id}, ${ip}, now() + interval '10 minutes')`;
  const key = await resendKey();
  if (!key) return json({ code: "not_configured" }, 503);
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to: email, subject: es ? `${code} es tu código de CaseAlerta` : `${code} is your CaseAlerta code`, html: codeHtml(es, code) }),
  });
  if (!r.ok) { console.error("resend", r.status, await r.text()); return json({ code: "email_failed", message: es ? "No pudimos mandar el correo. Intenta de nuevo." : "We could not send the email. Try again." }, 502); }
  return json({ ok: true });
}

async function verify(req: Request, b: any) {
  const me = await uidFrom(req);
  if (!me) return json({ code: "unauthorized" }, 401);
  const email = String(b.email ?? "").trim().toLowerCase();
  const code = String(b.code ?? "").replace(/\D/g, "");
  const es = b.lang !== "en";
  const bad = (m = es ? "El código no es correcto o ya venció." : "The code is wrong or expired.") => json({ code: "bad_code", message: m }, 400);
  if (!EMAIL_RE.test(email) || code.length !== 6) return bad();
  const rows = await sql`select id, code_hash, attempts, expires_at from casealerta.login_codes
    where email = ${email} and used_at is null order by created_at desc limit 1`;
  const row = rows[0];
  if (!row || new Date(row.expires_at) < new Date() || row.attempts >= 5) return bad();
  if (row.code_hash !== (await hash(`${email}:${code}`))) {
    await sql`update casealerta.login_codes set attempts = attempts + 1 where id = ${row.id}`;
    return bad();
  }
  await sql`update casealerta.login_codes set used_at = now() where id = ${row.id}`;

  if ((me.email ?? "").toLowerCase() === email) return json({ ok: true, mode: "linked" });
  const other = (await sql`select id from auth.users where lower(email) = ${email} and id <> ${me.id} limit 1`)[0];
  if (!other) {
    const { error } = await admin.auth.admin.updateUserById(me.id, { email, email_confirm: true });
    if (error) { console.error("link", error.message); return json({ code: "server_error" }, 500); }
    return json({ ok: true, mode: "linked" });
  }
  // Ya hay cuenta con ese correo: lo de esta sesión se muda allá (sin duplicar casos) y se devuelve un pase para cambiar de sesión.
  const to = other.id;
  await sql.begin(async (tx) => {
    await tx`update casealerta.cases c set owner_id = ${to} where owner_id = ${me.id} and org_id is null
      and not exists (select 1 from casealerta.cases x where x.owner_id = ${to} and x.receipt_number = c.receipt_number)`;
    await tx`update casealerta.case_events set owner_id = ${to} where owner_id = ${me.id} and case_id in (select id from casealerta.cases where owner_id = ${to})`;
    await tx`update casealerta.subscriptions set owner_id = ${to} where owner_id = ${me.id}`;
    await tx`update casealerta.orgs set owner_id = ${to} where owner_id = ${me.id}`;
    await tx`update casealerta.org_members m set owner_id = ${to} where owner_id = ${me.id}
      and not exists (select 1 from casealerta.org_members x where x.owner_id = ${to} and x.org_id = m.org_id)`;
  });
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data?.properties?.hashed_token) { console.error("generateLink", error?.message); return json({ code: "server_error" }, 500); }
  return json({ ok: true, mode: "switch", token_hash: data.properties.hashed_token });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ code: "method_not_allowed" }, 405);
  const b = await req.json().catch(() => ({}));
  try {
    if (b.action === "send_code") return await sendCode(req, b);
    if (b.action === "verify") return await verify(req, b);
    return json({ code: "unknown_action" }, 400);
  } catch (e) { console.error(e); return json({ code: "server_error" }, 500); }
});
