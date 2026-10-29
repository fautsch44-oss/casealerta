// CaseAlerta · CANDADO · borrar mi cuenta (App Store 5.1.1(v) y requisito de privacidad del affidávit de USCIS)
// POST (Authorization: JWT del usuario) → borra al usuario de auth; las tablas de casealerta caen en cascada.
// Los registros de pago siguen en Stripe / Apple / Google, que son los obligados a guardarlos.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.4";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sql = postgres(Deno.env.get("SUPABASE_DB_URL")!, { prepare: false, max: 2 });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ code: "method_not_allowed" }, 405);
  const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: u, error } = await admin.auth.getUser(jwt);
  if (error || !u?.user) return json({ code: "unauthorized" }, 401);
  const uid = u.user.id;
  try {
    // Suscripción vigente: se avisa para que la persona la cancele en su tienda (Apple/Google) o en el portal de Stripe.
    const [{ plan }] = await sql`select casealerta.active_plan(${uid}) as plan`;
    await sql`delete from casealerta.lookup_log where owner_id = ${uid}`;
    await sql`update casealerta.product_events set owner_id = null where owner_id = ${uid}`;
    const { error: de } = await admin.auth.admin.deleteUser(uid);
    if (de) { console.error("deleteUser", de.message); return json({ code: "server_error" }, 500); }
    return json({ ok: true, had_plan: plan ?? null });
  } catch (e) {
    console.error(e);
    return json({ code: "server_error" }, 500);
  }
});
