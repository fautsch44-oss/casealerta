// CaseAlerta · HUÉSPED · agente residente (app y web). Resuelve con datos del caso (caché de explicaciones) y, si hay llave, con modelo vía OpenRouter.
// POST { message, case_id?, lang?: 'es'|'en', surface?: 'app'|'web', web_case?: {receipt_number, form_type, status_en} }
// POST { action: 'ticket', question, case_id?, email? }
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import postgres from "npm:postgres@3.4.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const DAILY_LIMIT = 20;
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const PRODUCT = `CÓMO SE USA CASEALERTA (para guiar a la persona):
- Web casealerta.com: pegar el número de recibo (3 letras + 10 números, viene en el aviso I-797C) y tocar «Ver mi estatus». Consulta gratis, sin cuenta. Para avisos: escribir el correo en «Avísame cuando cambie» y confirmar desde el correo. También se puede activar el globo en el navegador.
- Cada estatus tiene su página explicada por formulario en casealerta.com/estatus/ (inglés: /status/). Boletín de visas en casealerta.com/boletin-de-visas/.
- App (Android ya en pruebas; iOS en camino): botón + para agregar recibos, semáforo por caso, Detalle con qué significa y qué sigue, historia, botón copiar recibo, Boletín de visas con fecha de prioridad, seguimiento NVC/consulado, Ajustes para idioma y avisos.
- Planes: Gratis (consulta web). Pro $9.99/mes o $69.99/año: avisos al instante, hasta 5 casos. Familia $14.99/mes: hasta 15 casos.
- Sin anuncios y sin venta de datos. Abogado solo si la persona lo pide.`;

const SYSTEM = (lang: string, surface: string) => `Eres el asistente de CaseAlerta, una app de VARGER Group LLC que avisa cuando cambia un caso migratorio ante USCIS y explica qué significa y qué sigue.
La persona te escribe desde ${surface === "web" ? "la página web casealerta.com" : "la app"}.
Responde SIEMPRE en ${lang === "en" ? "inglés estadounidense" : "español mexicano neutro"}.
Reglas:
- Frases cortas, nivel principiante. Una sola pregunta por mensaje.
- Sobre su caso usa SOLO los datos del bloque CONTEXTO. No inventes fechas, plazos ni resultados.
- Puedes explicar en términos generales cómo funciona un trámite de USCIS (pasos típicos, qué es biometría, RFE, entrevista) sin dar criterio legal.
- Puedes guiar sobre cómo usar CaseAlerta con la información de USO.
- Nunca prometas una fecha exacta de decisión; usa rangos típicos solo si vienen en el contexto.
- No das asesoría legal. Si la pregunta requiere criterio legal (elegibilidad, estrategia, qué contestar a un RFE), dilo y ofrece hablar con un abogado o representante acreditado.
- Si no sabes o el dato no está en el contexto, dilo y ofrece crear un ticket para que una persona te responda.
- No pidas reseñas ni ofrezcas nada a cambio de reseñas.
- Termina con el siguiente paso concreto.
Máximo 120 palabras.

USO:
${PRODUCT}`;

type Ctx = { cases: any[]; focus: any | null; explanation: any | null; pro: boolean; bulletin: any | null };

async function vault(name: string) {
  const r = await sql`select decrypted_secret from vault.decrypted_secrets where name = ${name} limit 1`;
  return r[0]?.decrypted_secret ?? null;
}

async function context(uid: string, caseId: string | null, lang: string, webCase: any | null): Promise<Ctx> {
  const cases = await sql`select id, receipt_number, form_type, label, last_status_text, last_changed_at, priority_date, preference_category, chargeability
    from casealerta.cases where owner_id = ${uid} and active order by last_changed_at desc nulls last limit 10`;
  let focus = cases.find((c) => c.id === caseId) ?? null;
  if (!focus && webCase?.receipt_number) {
    focus = cases.find((c) => c.receipt_number === webCase.receipt_number) ??
      { id: null, receipt_number: String(webCase.receipt_number).slice(0, 13), form_type: webCase.form_type ? String(webCase.form_type).slice(0, 12) : null,
        label: null, last_status_text: webCase.status_en ? String(webCase.status_en).slice(0, 200) : null, last_changed_at: null };
  }
  focus = focus ?? cases[0] ?? null;
  let explanation = null, bulletin = null;
  if (focus?.last_status_text) {
    explanation = (await sql`select status_title, meaning, next_steps, typical_days_min, typical_days_max from casealerta.status_explanations
      where lower(status_code) = lower(${focus.last_status_text}) and lang = ${lang}::casealerta.lang
      order by (form_type = ${focus.form_type ?? ""}) desc, (form_type = 'ANY') desc limit 1`)[0] ?? null;
  }
  if (focus?.preference_category) {
    bulletin = (await sql`select bulletin_month, cutoff_date, status from casealerta.visa_bulletin
      where chart = 'dates_for_filing' and category = ${focus.preference_category} and chargeability = ${focus.chargeability ?? "ALL"}
      order by bulletin_month desc limit 1`)[0] ?? null;
  }
  const pro = (await sql`select 1 from casealerta.subscriptions where owner_id = ${uid} and status in ('trialing','active') limit 1`).length > 0;
  const all = focus && !cases.some((c) => c.receipt_number === focus.receipt_number) ? [focus, ...cases] : cases;
  return { cases: all, focus, explanation, pro, bulletin };
}

/** Respuesta sin modelo: intención por palabras clave + caché de explicaciones. Costo cero. */
function cached(msg: string, c: Ctx, lang: string, surface: string) {
  const es = lang !== "en";
  const m = msg.toLowerCase();
  const ex = c.explanation;
  const name = c.focus ? (c.focus.label || c.focus.form_type || c.focus.receipt_number) : null;
  if (/\bapp\b|aplicaci[oó]n|descarg|download|instal/.test(m)) return es ? "La app de CaseAlerta está en pruebas en Android y llega pronto a iPhone. Mientras, aquí en la web consultas gratis y activas avisos por correo con «Avísame cuando cambie»." : "The CaseAlerta app is in testing on Android and coming soon to iPhone. Meanwhile, check for free here and turn on email alerts with “Alert me when it changes”.";
  if (/avis|alert|correo|email|notific/.test(m)) return es ? "Escribe tu correo en «Avísame cuando cambie» y confírmalo desde el correo que te llega. Desde ahí te aviso cada vez que cambie tu caso. Sin anuncios." : "Type your email in “Alert me when it changes” and confirm it from the email you receive. From then on I alert you every time your case changes. No ads.";
  if (/precio|cuesta|cost|price|pro\b|plan/.test(m)) return es ? "Consultar en la web es gratis. Pro cuesta $9.99 al mes o $69.99 al año: avisos al instante y hasta 5 casos. Familia: $14.99 al mes, hasta 15 casos." : "Checking on the web is free. Pro is $9.99/month or $69.99/year: instant alerts and up to 5 cases. Family: $14.99/month, up to 15 cases.";
  if (!c.focus) return es ? (surface === "web" ? "Pega tu número de recibo arriba (3 letras y 10 números, viene en tu aviso I-797C) y te explico tu estatus." : "Aún no tienes casos. Pega tu número de recibo con el botón + y te explico tu estatus.")
    : (surface === "web" ? "Paste your receipt number above (3 letters and 10 digits, on your I-797C notice) and I'll explain your status." : "You have no cases yet. Paste your receipt number with the + button and I'll explain your status.");
  if (/abogad|lawyer|attorney|legal/.test(m)) return es ? "No doy asesoría legal. Para decisiones sobre tu caso habla con un abogado de inmigración o un representante acreditado." : "I can't give legal advice. For decisions about your case, talk to an immigration attorney or accredited representative.";
  if (/bolet|bulletin|prioridad|priority/.test(m)) {
    if (!c.bulletin) return es ? "Revisa el boletín de visas en casealerta.com/boletin-de-visas/ con tu categoría y país. En la app capturas tu fecha de prioridad y te aviso cuando sea actual." : "Check the visa bulletin at casealerta.com/en/visa-bulletin/ with your category and country. In the app you enter your priority date and I alert you when it's current.";
    const cur = c.bulletin.status === "current" || (c.focus.priority_date && c.bulletin.cutoff_date && c.focus.priority_date < c.bulletin.cutoff_date);
    return es ? (cur ? "Tu fecha de prioridad ya es actual en el boletín de este mes. Siguiente paso: presentar la residencia (I-485) o seguir con el NVC." : `Tu fecha aún no es actual. El boletín va en ${c.bulletin.cutoff_date}. Te aviso en cuanto llegue a tu fecha.`)
              : (cur ? "Your priority date is current in this month's bulletin. Next step: file the I-485 or continue with NVC." : `Your date is not current yet. The bulletin is at ${c.bulletin.cutoff_date}. I'll alert you when it reaches your date.`);
  }
  if (/cu[aá]nto|tarda|tiempo|how long|when|cu[aá]ndo/.test(m)) {
    if (ex?.typical_days_min != null && ex?.typical_days_max != null) return es ? `Para este estatus lo típico es ${ex.typical_days_min} a ${ex.typical_days_max} días. Es un rango, no una fecha exacta.` : `For this status the typical range is ${ex.typical_days_min} to ${ex.typical_days_max} days. It's a range, not an exact date.`;
    return es ? "USCIS no publica un tiempo fijo para este paso. En la página de tu estatus ves el rango típico de tu formulario, y te aviso al instante cuando cambie." : "USCIS doesn't publish a fixed time for this step. Your status page shows the typical range for your form, and I'll alert you the moment it changes.";
  }
  if (/sigue|next|hacer|do now|qu[eé] hago/.test(m) && ex?.next_steps?.length) return (es ? `Qué sigue con tu ${name}:\n` : `What's next for your ${name}:\n`) + ex.next_steps.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n");
  if (ex) return (es ? `Tu ${name} está en «${ex.status_title}». ` : `Your ${name} is at “${ex.status_title}”. `) + ex.meaning + (ex.next_steps?.[0] ? (es ? `\nSiguiente paso: ${ex.next_steps[0]}` : `\nNext step: ${ex.next_steps[0]}`) : "");
  return null; // sin dato: ofrecer ticket
}

function upsell(c: Ctx, lang: string) {
  if (c.pro) return null;
  const es = lang !== "en";
  const recent = c.cases.some((x) => x.last_changed_at && Date.now() - new Date(x.last_changed_at).getTime() < 7 * 864e5);
  if (c.cases.length >= 2 || recent) return {
    reason: c.cases.length >= 2 ? "multiple_cases" : "recent_change",
    title: es ? "Con Pro te aviso al instante" : "With Pro I alert you instantly",
    perks: es ? ["Globo y correo en cuanto cambie cualquier caso", "Hasta 5 casos (Familia: 15)", "Qué sigue y boletín de visas en cada cambio"] : ["Push and email the moment any case changes", "Up to 5 cases (Family: 15)", "What's next and visa bulletin on every change"],
  };
  return null;
}

async function model(msg: string, c: Ctx, lang: string, history: any[], surface: string) {
  const key = await vault("casealerta_openrouter_key");
  if (!key) return null;
  const mdl = (await vault("casealerta_huesped_model")) ?? "google/gemini-2.5-flash";
  const ctx = { casos: c.cases.map((x) => ({ nombre: x.label || x.form_type, formulario: x.form_type, recibo: x.receipt_number, estatus_oficial: x.last_status_text, ultimo_cambio: x.last_changed_at })), caso_en_foco: c.focus?.receipt_number ?? null, explicacion_cache: c.explanation, boletin: c.bulletin, plan: c.pro ? "pro" : "gratis" };
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://casealerta.com", "X-Title": "CaseAlerta" },
    body: JSON.stringify({ model: mdl, temperature: 0.2, max_tokens: 400, messages: [
      { role: "system", content: SYSTEM(lang, surface) + `\n\nCONTEXTO:\n${JSON.stringify(ctx)}` },
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: msg },
    ] }),
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j.choices?.[0]?.message?.content as string | undefined)?.trim() || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ code: "method_not_allowed" }, 405);
  const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } });
  const { data: u } = await supa.auth.getUser();
  const uid = u?.user?.id;
  if (!uid) return json({ code: "unauthorized" }, 401);
  const body = await req.json().catch(() => ({}));
  const lang = body.lang === "en" ? "en" : "es";
  const surface = body.surface === "web" ? "web" : "app";
  const caseId = typeof body.case_id === "string" ? body.case_id : null;
  const webCase = body.web_case && typeof body.web_case === "object" && /^[A-Z]{3}[0-9]{10}$/.test(String(body.web_case.receipt_number ?? "")) ? body.web_case : null;

  if (body.action === "ticket") {
    const q = String(body.question ?? "").slice(0, 2000);
    if (!q) return json({ code: "empty" }, 400);
    const c = await context(uid, caseId, lang, webCase);
    const email = typeof body.email === "string" && /.+@.+\..+/.test(body.email) ? body.email : (u.user.email ?? null);
    await sql`insert into casealerta.support_tickets (owner_id, case_id, question, context, contact_email)
      values (${uid}, ${c.focus?.id ?? null}, ${q}, ${sql.json({ status: c.focus?.last_status_text ?? null, form: c.focus?.form_type ?? null, receipt: c.focus?.receipt_number ?? null, lang, surface })}, ${email})`;
    await sql`insert into casealerta.product_events (owner_id, event, props) values (${uid}, 'ticket', ${sql.json({ case_id: c.focus?.id ?? null, surface })})`;
    return json({ ok: true, reply: email
      ? (lang === "es" ? "Listo. Una persona del equipo te responde por correo en menos de 24 horas." : "Done. A person from our team will reply by email within 24 hours.")
      : (lang === "es" ? "Listo, recibimos tu pregunta. Para responderte por correo, activa «Avísame cuando cambie» con tu correo." : "Done, we got your question. To reply by email, turn on “Alert me when it changes” with your email.") });
  }

  const msg = String(body.message ?? "").trim().slice(0, 1000);
  if (!msg) return json({ code: "empty" }, 400);
  const used = (await sql`select count(*)::int as n from casealerta.huesped_messages where owner_id = ${uid} and role = 'user' and created_at > now() - interval '1 day'`)[0].n;
  if (used >= DAILY_LIMIT) return json({ reply: lang === "es" ? "Por hoy llegamos al límite de preguntas. Mañana seguimos; si es urgente, crea un ticket y una persona te responde." : "We've reached today's question limit. Let's continue tomorrow; if it's urgent, create a ticket and a person will reply.", limit: true, offer_ticket: true });

  const c = await context(uid, caseId, lang, webCase);
  const history = await sql`select role, content from casealerta.huesped_messages where owner_id = ${uid} order by created_at desc limit 6`;
  let reply = await model(msg, c, lang, [...history].reverse(), surface).catch(() => null);
  let source = "model";
  if (!reply) { reply = cached(msg, c, lang, surface); source = "cache"; }
  const offerTicket = !reply;
  if (!reply) { reply = lang === "es" ? "No tengo ese dato para tu caso. ¿Quieres que una persona del equipo te responda? Toca «Crear ticket»." : "I don't have that information for your case. Want a person from our team to answer? Tap “Create ticket”."; source = "fallback"; }
  const up = upsell(c, lang);

  await sql`insert into casealerta.huesped_messages (owner_id, case_id, role, content, source) values
    (${uid}, ${c.focus?.id ?? null}, 'user', ${msg}, ${source}), (${uid}, ${c.focus?.id ?? null}, 'assistant', ${reply}, ${source})`;
  await sql`insert into casealerta.product_events (owner_id, event, props) values (${uid}, 'huesped_mensaje', ${sql.json({ source, surface })})`;
  if (up) await sql`insert into casealerta.product_events (owner_id, event, props) values (${uid}, 'upsell_visto', ${sql.json({ reason: up.reason, via: "huesped", surface })})`;
  return json({ reply, source, upsell: up, offer_ticket: offerTicket });
});
