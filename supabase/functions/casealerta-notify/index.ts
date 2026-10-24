// CaseAlerta · YUNQUE · avisos de cambio de estatus: globo app (Expo), globo web (Web Push) y correo (Resend)
// POST {"mode":"dispatch"} con header x-cron-key = vault.casealerta_cron_key
// Candado de cobro (24 oct 2026): lo que se paga se entrega solo a quien paga.
//   Gratis (persona) → sin avisos (solo consulta manual). Pro → globo + correo, 5 casos. Familia → 15.
//   Organización → solo con plan vigente (prueba o pagado), hasta 50 / 250 peticiones.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.4";
import webpush from "npm:web-push@3.6.7";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
let RESEND_KEY: string | null | undefined = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("CASEALERTA_FROM") ?? "CaseAlerta <alertas@casealerta.com>";
const SITE = "https://casealerta.com";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function secret(name: string): Promise<string | null> {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name} limit 1`;
  return r[0]?.decrypted_secret ?? null;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

function emailHtml(lang: string, label: string, receipt: string, title: string, meaning: string, steps: string[], free = false) {
  const es = lang === "es";
  const li = steps.map((s) => `<li style="margin:0 0 6px">${esc(s)}</li>`).join("");
  const up = free ? `<p style="margin:16px 0 0;font-size:14px;background:#F3F6FB;border-radius:12px;padding:12px 14px">${es ? "¿Quieres el aviso al instante en tu celular y vigilar hasta 5 casos? " : "Want the alert instantly on your phone and to watch up to 5 cases? "}<a href="${SITE}/${es ? "" : "en/"}#planes" style="color:#C8102E;font-weight:bold">${es ? "Activa Pro" : "Get Pro"}</a></p>` : "";
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#F3F6FB;font-family:Arial,Helvetica,sans-serif;color:#0F2A5C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:18px;overflow:hidden">
<tr><td style="background:#1F4FA0;padding:18px 22px"><img src="${SITE}/sello.png" width="48" height="48" alt="CaseAlerta" style="vertical-align:middle;background:#fff;border-radius:50%;border:3px solid #D4A84B">
<span style="color:#fff;font:bold 20px Georgia,serif;letter-spacing:1px;vertical-align:middle;margin-left:10px">CASEALERTA</span></td></tr>
<tr><td style="height:6px;background:linear-gradient(#C8102E 0 2px,#fff 2px 4px,#1F4FA0 4px 6px)"></td></tr>
<tr><td style="padding:22px"><p style="margin:0 0 6px;font-size:13px;color:#5B6478">${esc(label)} · ${esc(receipt)}</p>
<h1 style="margin:0 0 14px;font-size:22px">${es ? "Tu caso cambió" : "Your case changed"}: ${esc(title)}</h1>
<p style="margin:0 0 16px;font-size:16px;line-height:1.5;background:#FFF8E6;border:1px solid #E8D28A;border-radius:12px;padding:12px 14px">${esc(meaning)}</p>
<p style="margin:0 0 6px;font-weight:bold">${es ? "Qué sigue" : "What is next"}</p><ol style="margin:0 0 18px;padding-left:20px;font-size:15px">${li}</ol>
<a href="${SITE}/${es ? "" : "en/"}" style="display:inline-block;background:#C8102E;color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:12px">${es ? "Ver mi caso" : "See my case"}</a>${up}
<p style="margin:18px 0 0;font-size:12px;color:#5B6478">${es ? "Estatus oficial de USCIS. Explicación con IA, no es asesoría legal. Sin anuncios." : "Official USCIS status. AI-assisted explanation, not legal advice. No ads."}</p></td></tr></table></td></tr></table></body></html>`;
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_KEY) RESEND_KEY = await secret("casealerta_resend_key");
  if (!RESEND_KEY) return { ok: false, status: 0 };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }) });
  return { ok: r.ok, status: r.status, body: await r.text() };
}

/** Qué canales tiene derecho a recibir este caso según el plan vigente. */
function entitlement(ev: { org_id: string | null; plan: string | null; rank: number }) {
  if (ev.org_id) {
    const lim = ev.plan === "employer_250" || ev.plan === "law_firm_3" ? 250 : ev.plan ? 50 : 0;
    return { email: ev.rank < lim, push: ev.rank < lim, free: false };
  }
  if (ev.plan === "family") return { email: ev.rank < 15, push: ev.rank < 15, free: false };
  if (ev.plan === "pro") return { email: ev.rank < 5, push: ev.rank < 5, free: false };
  return { email: false, push: false, free: true }; // gratis: sin avisos, los avisos son de Pro
}

async function dispatch() {
  const pub = await secret("casealerta_vapid_public"), priv = await secret("casealerta_vapid_private");
  if (pub && priv) webpush.setVapidDetails("mailto:sales@vargersoft.com", pub, priv);
  const events = await sql`
    select e.id, e.case_id, e.owner_id, e.status_text, c.receipt_number, c.org_id, coalesce(c.label, c.form_type, 'Caso') as label,
           p.lang::text as lang, p.push_enabled, p.email_enabled, p.web_push_enabled, u.email,
           case when c.org_id is not null then casealerta.org_plan(c.org_id) else casealerta.active_plan(c.owner_id) end as plan,
           (select count(*)::int from casealerta.cases x where coalesce(x.active, true)
              and (case when c.org_id is null then x.owner_id = c.owner_id and x.org_id is null else x.org_id = c.org_id end)
              and (x.created_at, x.id) < (c.created_at, c.id)) as rank
    from casealerta.case_events e
    join casealerta.cases c on c.id = e.case_id
    join auth.users u on u.id = e.owner_id
    left join casealerta.profiles p on p.owner_id = e.owner_id
    where e.detected_at > now() - interval '2 days'
      and not exists (select 1 from casealerta.notifications_log n where n.case_event_id = e.id)
    order by e.detected_at limit 200`;
  const out = { events: events.length, push: 0, web: 0, email: 0, failed: 0, skipped_plan: 0 };
  for (const ev of events) {
    const lang = ev.lang ?? "es";
    const ent = entitlement(ev as any);
    const log = (channel: string, status: string) =>
      sql`insert into casealerta.notifications_log (owner_id, case_id, case_event_id, channel, status) values (${ev.owner_id}, ${ev.case_id}, ${ev.id}, ${channel}::casealerta.channel, ${status})`;
    if (!ent.email && !ent.push) { await log("email", "skipped_plan"); out.skipped_plan++; continue; }
    const ex = (await sql`select status_title, meaning, next_steps from casealerta.status_explanations
      where status_code = ${ev.status_text} and lang = ${lang}::casealerta.lang order by form_type = 'ANY' limit 1`)[0];
    const title = ex?.status_title ?? ev.status_text;
    const meaning = ex?.meaning ?? ev.status_text;
    const steps: string[] = ex?.next_steps ?? [];
    const head = `${ev.label}: ${title}`;
    let sent = false;
    if (ent.push) {
      const tokens = await sql`select platform::text as platform, expo_token, web_subscription from casealerta.push_tokens where owner_id = ${ev.owner_id}`;
      const expo = tokens.filter((t) => t.expo_token && ev.push_enabled !== false).map((t) => ({ to: t.expo_token, title: head, body: meaning, sound: "default", data: { case_id: ev.case_id } }));
      if (expo.length) {
        const r = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(expo) });
        await log("push", r.ok ? "sent_app" : `failed_app_${r.status}`); r.ok ? out.push++ : out.failed++; sent = true;
      }
      if (pub && priv && ev.web_push_enabled !== false) {
        for (const t of tokens.filter((t) => t.web_subscription)) {
          try { await webpush.sendNotification(t.web_subscription, JSON.stringify({ title: head, body: meaning, url: `${SITE}/` })); await log("push", "sent_web"); out.web++; sent = true; }
          catch (e: any) {
            out.failed++; await log("push", `failed_web_${e?.statusCode ?? "x"}`); sent = true;
            if (e?.statusCode === 404 || e?.statusCode === 410) await sql`delete from casealerta.push_tokens where web_subscription->>'endpoint' = ${t.web_subscription.endpoint}`;
          }
        }
      }
    }
    if (ent.email && ev.email && ev.email_enabled !== false) {
      const r = await sendEmail(ev.email, `${lang === "es" ? "Tu caso cambió" : "Your case changed"} · ${head}`, emailHtml(lang, ev.label, ev.receipt_number, title, meaning, steps, ent.free));
      await log("email", r.ok ? "sent" : (r.status ? `failed_${r.status}` : "skipped_no_key")); r.ok ? out.email++ : out.failed++; sent = true;
    }
    if (!sent) await log("email", "skipped_no_channel");
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ code: "method_not_allowed" }, 405);
  const key = await secret("casealerta_cron_key");
  if (!key || req.headers.get("x-cron-key") !== key) return json({ code: "forbidden" }, 403);
  const body = await req.json().catch(() => ({}));
  if (body.mode === "vapid_public") return json({ key: await secret("casealerta_vapid_public") });
  if (body.mode === "test_email" && typeof body.to === "string") {
    const r = await sendEmail(body.to, "CaseAlerta · prueba de aviso / test alert", emailHtml(body.lang === "en" ? "en" : "es", "I-485", "EAC9999103403", body.lang === "en" ? "Case Was Approved" : "Caso Aprobado", body.lang === "en" ? "Good news: USCIS approved your case. This is a test message." : "Buenas noticias: USCIS aprobó tu caso. Este es un mensaje de prueba.", body.lang === "en" ? ["Watch for the approval notice"] : ["Espera el aviso de aprobación"]));
    return json(r, r.ok ? 200 : 502);
  }
  return json(await dispatch());
});
