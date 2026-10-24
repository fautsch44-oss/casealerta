// CaseAlerta · YUNQUE · webhook Stripe → casealerta.subscriptions (varger-core).
// verify_jwt = false: Stripe firma cada evento (Stripe-Signature, HMAC-SHA256); el secreto whsec vive en Vault
// ('casealerta_stripe_whsec') o en el secreto de la función STRIPE_WEBHOOK_SECRET.
// La cuenta de Stripe es compartida por varias apps VARGER: solo se procesa lo que trae metadata.app = 'casealerta'.
// Cobro web (Payment Links): client_reference_id = <uid de Supabase> (persona) u org_<uuid> (tablero B2B).
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLANS = new Set(["pro", "family", "employer", "employer_250", "law_firm", "law_firm_3"]);
const iso = (s?: number | null) => (typeof s === "number" && s > 0 ? new Date(s * 1000).toISOString() : null);

let cachedSecret: string | null = null;
async function secret() {
  if (cachedSecret) return cachedSecret;
  const env = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (env) return (cachedSecret = env);
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = 'casealerta_stripe_whsec' limit 1`;
  return (cachedSecret = r[0]?.decrypted_secret ?? null);
}

const enc = new TextEncoder();
function hex(buf: ArrayBuffer) { return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""); }
function safeEq(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
async function verify(raw: string, header: string, key: string) {
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=", 2) as [string, string]).filter((p) => p.length === 2).map(([k, v]) => [k, v]));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || !sigs.length) return false;
  if (Math.abs(Date.now() / 1000 - t) > 300) return false;
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = hex(await crypto.subtle.sign("HMAC", k, enc.encode(`${t}.${raw}`)));
  return sigs.some((s) => safeEq(s, mac));
}

function mapStatus(s: string): string {
  if (s === "trialing" || s === "active" || s === "past_due" || s === "canceled") return s;
  if (s === "unpaid" || s === "incomplete") return "past_due";
  if (s === "incomplete_expired") return "expired";
  return "canceled"; // paused y cualquier otro: sin acceso
}

function subFields(sub: any) {
  const item = sub?.items?.data?.[0];
  const price = item?.price;
  return {
    status: mapStatus(String(sub?.status ?? "active")),
    trial_ends_at: iso(sub?.trial_end),
    current_period_end: iso(sub?.current_period_end ?? item?.current_period_end),
    cancel_at_period_end: !!sub?.cancel_at_period_end,
    amount_cents: typeof price?.unit_amount === "number" ? price.unit_amount : null,
    interval: price?.recurring?.interval === "year" ? "year" : price?.recurring?.interval === "month" ? "month" : null,
    plan: PLANS.has(sub?.metadata?.plan) ? sub.metadata.plan : null,
    customer_id: typeof sub?.customer === "string" ? sub.customer : sub?.customer?.id ?? null,
  };
}

async function applySub(sub: any) {
  const f = subFields(sub);
  const r = await sql`update casealerta.subscriptions set
      status = ${f.status}::casealerta.sub_status, trial_ends_at = ${f.trial_ends_at}, current_period_end = ${f.current_period_end},
      cancel_at_period_end = ${f.cancel_at_period_end}, amount_cents = coalesce(${f.amount_cents}, amount_cents),
      interval = coalesce(${f.interval}, interval), plan = coalesce(${f.plan}::casealerta.plan, plan),
      customer_id = coalesce(${f.customer_id}, customer_id), updated_at = now()
    where source = 'stripe' and external_id = ${sub.id} returning id`;
  return r.length > 0;
}

async function ownerFor(ref: string | null, email: string | null): Promise<{ owner: string | null; org: string | null }> {
  if (ref && ref.startsWith("org_") && UUID.test(ref.slice(4))) {
    const o = await sql`select id, owner_id from casealerta.orgs where id = ${ref.slice(4)} limit 1`;
    if (o[0]) return { owner: o[0].owner_id, org: o[0].id };
  }
  if (ref && UUID.test(ref)) {
    const u = await sql`select id from auth.users where id = ${ref} limit 1`;
    if (u[0]) return { owner: u[0].id, org: null };
  }
  if (email) {
    const u = await sql`select id from auth.users where lower(email) = ${email.toLowerCase()} limit 1`;
    if (u[0]) return { owner: u[0].id, org: null };
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { source: "stripe" } });
    if (!error && data.user) return { owner: data.user.id, org: null };
    console.error("createUser", error?.message);
  }
  return { owner: null, org: null };
}

async function checkoutCompleted(cs: any) {
  if (cs.mode !== "subscription" || !cs.subscription) return "skip_mode";
  const plan = PLANS.has(cs.metadata?.plan) ? cs.metadata.plan : null;
  if (!plan) return "skip_plan";
  const subId = typeof cs.subscription === "string" ? cs.subscription : cs.subscription.id;
  const email: string | null = cs.customer_details?.email ?? cs.customer_email ?? null;
  const customer = typeof cs.customer === "string" ? cs.customer : cs.customer?.id ?? null;
  const { owner, org } = await ownerFor(cs.client_reference_id ?? null, email);
  if (!owner) return "no_owner";
  const interval = cs.metadata?.interval === "year" ? "year" : "month";
  const trialing = cs.payment_status === "no_payment_required";
  await sql`insert into casealerta.subscriptions (owner_id, org_id, source, external_id, plan, interval, status, amount_cents, currency, customer_id, customer_email)
    values (${owner}, ${org}, 'stripe', ${subId}, ${plan}::casealerta.plan, ${interval}, ${trialing ? "trialing" : "active"}::casealerta.sub_status,
            ${trialing ? null : cs.amount_total ?? null}, ${cs.currency ?? "usd"}, ${customer}, ${email})
    on conflict (source, external_id) do update set owner_id = excluded.owner_id, org_id = excluded.org_id, customer_id = excluded.customer_id,
      customer_email = excluded.customer_email, updated_at = now()`;
  if (org && customer) await sql`update casealerta.orgs set stripe_customer_id = ${customer} where id = ${org}`;
  // Persona anónima de la web: le pegamos el correo de Stripe para que pueda recuperar su plan desde otro navegador.
  if (!org && email) {
    const u = await sql`select email from auth.users where id = ${owner}`;
    const taken = await sql`select 1 from auth.users where lower(email) = ${email.toLowerCase()} and id <> ${owner} limit 1`;
    if (u[0] && !u[0].email && !taken[0]) {
      const { error } = await admin.auth.admin.updateUserById(owner, { email, email_confirm: true });
      if (error) console.error("updateUser", error.message);
    }
  }
  // Si el evento de la suscripción llegó antes que este, se aplica ahora.
  const last = await sql`select payload from casealerta.stripe_events where object_id = ${subId} and type like 'customer.subscription.%' order by received_at desc limit 1`;
  if (last[0]) await applySub(last[0].payload.data.object);
  return "ok";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  const key = await secret();
  if (!key) return json({ ok: false, error: "not_configured" }, 503);
  const raw = await req.text();
  if (!(await verify(raw, req.headers.get("stripe-signature") ?? "", key))) return json({ ok: false, error: "bad_signature" }, 400);
  let ev: any;
  try { ev = JSON.parse(raw); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  const obj = ev?.data?.object ?? {};
  if (obj?.metadata?.app !== "casealerta") return json({ ok: true, status: "ignored" });

  const ins = await sql`insert into casealerta.stripe_events (id, type, object_id, payload) values (${ev.id}, ${ev.type}, ${obj.id ?? null}, ${sql.json(ev)})
    on conflict (id) do nothing returning id`;
  if (!ins.length) {
    const prev = await sql`select processed from casealerta.stripe_events where id = ${ev.id}`;
    if (prev[0]?.processed === "ok") return json({ ok: true, status: "duplicate" });
  }
  try {
    let result = "ignored";
    if (ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") result = await checkoutCompleted(obj);
    else if (ev.type.startsWith("customer.subscription.")) result = (await applySub(obj)) ? "ok" : "pending";
    await sql`update casealerta.stripe_events set processed = ${result} where id = ${ev.id}`;
    return json({ ok: true, status: result });
  } catch (e) {
    console.error(ev.type, e);
    await sql`update casealerta.stripe_events set processed = 'error' where id = ${ev.id}`;
    return json({ ok: false, error: "server_error" }, 500);
  }
});
