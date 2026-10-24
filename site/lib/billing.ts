'use client';
// Cobro web de CaseAlerta (skill flujo-onboarding §5): Stripe Payment Links + webhook → casealerta.subscriptions.
// La web nunca da por pagado un plan por el clic o por la redirección: solo cuando el webhook escribió la fila (§3, §5).
import type { Lang } from './types';
import { sb, session, store } from './sb';
import { track } from '@/components/Analytics';

export type PlanKey = 'pro' | 'family' | 'employer' | 'law_firm';
export type Interval = 'month' | 'year';

// Ligas de pago en vivo (cuenta Stripe VARGER GROUP LLC). Precios v2 del plan maestro, 19 oct 2026.
export const LINKS: Record<PlanKey, Partial<Record<Interval, string>>> = {
  pro: { month: 'https://buy.stripe.com/4gMdRa4Kp2YU3va9IQ0gw00', year: 'https://buy.stripe.com/28EbJ20u9czu1n2g7e0gw01' },
  family: { month: 'https://buy.stripe.com/4gM00k3GlbvqaXCf3a0gw02', year: 'https://buy.stripe.com/8x228sfp37fa9Ty1ck0gw03' },
  employer: { month: 'https://buy.stripe.com/eVqeVe5Ot2YU2r608g0gw04', year: 'https://buy.stripe.com/bJe5kE4Kpbvqc1G4ow0gw05' },
  law_firm: { month: 'https://buy.stripe.com/dRm4gA2Ch572c1G8EM0gw06' },
};
export const PORTAL = 'https://billing.stripe.com/p/login/4gMdRa4Kp2YU3va9IQ0gw00';

export const PRICE: Record<PlanKey, Partial<Record<Interval, number>>> = {
  pro: { month: 9.99, year: 69.99 }, family: { month: 14.99, year: 99.99 }, employer: { month: 99, year: 990 }, law_firm: { month: 99 },
};

export type Pending = { plan: PlanKey; interval: Interval; lang: Lang; from: string; org?: string | null; at: number };
const KEY = 'ca-pay';
export const pending = {
  get: () => store.get<Pending | null>(KEY, null),
  clear: () => { try { localStorage.removeItem(KEY); } catch { /* sin almacenamiento */ } },
};

/** Abre Stripe para ese plan. Devuelve false si no se pudo (sin red / sin sesión) para que el botón muestre el error. */
export async function checkout(plan: PlanKey, interval: Interval, opts: { lang: Lang; from: string; orgId?: string | null; reason: string }) {
  const link = LINKS[plan][interval] ?? LINKS[plan].month!;
  track('plan_selected', { plan, interval, reason: opts.reason, price: PRICE[plan][interval] ?? PRICE[plan].month });
  try {
    const s = await session();
    const ref = opts.orgId ? `org_${opts.orgId}` : s.user.id;
    store.set(KEY, { plan, interval, lang: opts.lang, from: opts.from, org: opts.orgId ?? null, at: Date.now() } satisfies Pending);
    const u = new URL(link);
    u.searchParams.set('client_reference_id', ref);
    u.searchParams.set('locale', opts.lang);
    if (s.user.email) u.searchParams.set('prefilled_email', s.user.email);
    track('checkout_started', { plan, interval, reason: opts.reason, is_trial: plan === 'employer' || plan === 'law_firm' });
    window.location.assign(u.toString());
    return true;
  } catch {
    track('error_shown', { where: 'checkout', code: 'no_session' });
    return false;
  }
}

export type MySub = { plan: string; status: string; interval: string | null; current_period_end: string | null; cancel_at_period_end: boolean; org_id: string | null; trial_ends_at: string | null; created_at: string };

/** Plan activo de esta persona (o de su organización). No crea sesión anónima: si nunca consultó, no hay plan. */
export async function mySubs(orgId?: string | null): Promise<MySub[]> {
  try {
    const { data: s } = await sb().auth.getSession();
    if (!s.session) return [];
    let q = sb().from('subscriptions').select('plan,status,interval,current_period_end,cancel_at_period_end,org_id,trial_ends_at,created_at')
      .in('status', ['trialing', 'active', 'past_due']).order('created_at', { ascending: false });
    q = orgId ? q.eq('org_id', orgId) : q.is('org_id', null);
    const { data } = await q;
    return (data as MySub[]) ?? [];
  } catch { return []; }
}

export const PLAN_NAME: Record<Lang, Record<string, string>> = {
  es: { pro: 'Pro', family: 'Familia', employer: 'Empleador', employer_250: 'Empleador 250', law_firm: 'Despacho', law_firm_3: 'Despacho 3 ciudades' },
  en: { pro: 'Pro', family: 'Family', employer: 'Employer', employer_250: 'Employer 250', law_firm: 'Law firm', law_firm_3: 'Law firm 3 cities' },
};
