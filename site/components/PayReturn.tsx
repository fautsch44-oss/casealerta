'use client';
// Regreso de Stripe (flujo-onboarding §3 y §5): el plan se da por pagado SOLO cuando el webhook escribió la fila.
// «Gracias» regresa al origen: a la consulta (persona) o al tablero (empresa).
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/types';
import { P } from '@/lib/i18n';
import { PLAN_NAME, PORTAL, mySubs, pending, type MySub, type Pending } from '@/lib/billing';
import { track } from './Analytics';
import AccountBox from './AccountBox';

const S = {
  es: {
    wait: 'Confirmando tu pago…', waitS: 'Stripe ya nos avisó o está por avisarnos. Esto tarda unos segundos.',
    okT: (p: string) => `¡Listo! Ya eres ${p}`, trialT: 'Tu prueba de 14 días empezó', okS: 'Gracias por apoyar una app sin anuncios.',
    perks: { pro: ['Vigila hasta 5 casos', 'Aviso por correo y globo en tu navegador', 'Asistente con IA'], family: ['Vigila hasta 15 casos', 'Aviso por correo y globo en tu navegador', 'Asistente con IA'],
      employer: ['Hasta 50 peticiones en tu tablero', 'Avisos por correo a tu equipo', 'No se cobra nada antes del día 14'], law_firm: ['Hasta 50 casos en tu tablero', 'Avisos por correo a tu equipo', 'No se cobra nada antes del día 14'] } as Record<string, string[]>,
    goCases: 'Agregar mis casos', goBoard: 'Ir a mi tablero', manage: 'Administrar mi plan',
    slowT: 'Tu pago está en camino', slowS: 'Stripe ya te mandó el recibo por correo. La confirmación está tardando más de lo normal.', retry: 'Revisar otra vez', back: 'Volver',
    noneT: 'No hay un pago en curso', noneS: 'Si ya pagaste en otro navegador, entra con el correo que usaste.', plans: 'Ver planes', help: '¿Dudas? Escríbenos a soporte@casealerta.com',
  },
  en: {
    wait: 'Confirming your payment…', waitS: 'Stripe has told us or is about to. This takes a few seconds.',
    okT: (p: string) => `Done! You are now ${p}`, trialT: 'Your 14-day trial has started', okS: 'Thank you for supporting an app with no ads.',
    perks: { pro: ['Watch up to 5 cases', 'Email and browser notifications', 'AI assistant'], family: ['Watch up to 15 cases', 'Email and browser notifications', 'AI assistant'],
      employer: ['Up to 50 petitions on your dashboard', 'Email alerts to your team', 'Nothing is charged before day 14'], law_firm: ['Up to 50 cases on your dashboard', 'Email alerts to your team', 'Nothing is charged before day 14'] } as Record<string, string[]>,
    goCases: 'Add my cases', goBoard: 'Go to my dashboard', manage: 'Manage my plan',
    slowT: 'Your payment is on its way', slowS: 'Stripe already emailed you the receipt. Confirmation is taking longer than usual.', retry: 'Check again', back: 'Go back',
    noneT: 'No payment in progress', noneS: 'If you already paid in another browser, sign in with the email you used.', plans: 'See plans', help: 'Questions? Email soporte@casealerta.com',
  },
};

type State = 'wait' | 'ok' | 'slow' | 'none';

export default function PayReturn({ lang }: { lang: Lang }) {
  const s = S[lang], p = P[lang];
  const [st, setSt] = useState<State>('wait');
  const [sub, setSub] = useState<MySub | null>(null);
  const [pend, setPend] = useState<Pending | null>(null);
  const done = useRef(false);

  const poll = useCallback(async (pd: Pending | null) => {
    setSt('wait');
    const since = pd ? pd.at - 120_000 : 0;
    for (let i = 0; i < 18 && !done.current; i++) {
      const subs = await mySubs(pd?.org ?? null);
      const hit = subs.find((x) => new Date(x.created_at).getTime() >= since) ?? null;
      if (hit) {
        done.current = true; setSub(hit); setSt('ok');
        const trial = hit.status === 'trialing';
        track('purchase_completed', { plan: hit.plan, interval: hit.interval, is_trial: trial, source: 'stripe' });
        if (trial) track('trial_started', { plan: hit.plan, source: 'stripe' });
        pending.clear();
        return;
      }
      await new Promise((r) => setTimeout(r, 2500));
    }
    if (!done.current) { setSt('slow'); track('purchase_pending', { plan: pd?.plan ?? null, waited_s: 45 }); }
  }, []);

  useEffect(() => {
    const pd = pending.get();
    // La liga de Stripe regresa siempre a /pago/: si la persona venía del sitio en inglés, se va a /en/pay/ sin perder el ?cs=.
    if (pd && pd.lang !== lang) { window.location.replace(`${P[pd.lang].pay}${window.location.search}`); return; }
    setPend(pd);
    const cs = new URLSearchParams(window.location.search).get('cs');
    if (!pd && !cs) { setSt('none'); return; }
    poll(pd);
  }, [lang, poll]);

  const isOrg = !!(sub?.org_id ?? pend?.org);
  const planName = sub ? PLAN_NAME[lang][sub.plan] ?? sub.plan : pend ? PLAN_NAME[lang][pend.plan] : '';
  const back = isOrg ? p.dashboard : `${p.home}#consulta`;

  return (
    <main className="wrap" style={{ padding: '40px 16px 60px' }}>
      <div className="card payBox" aria-live="polite">
        {st === 'wait' && <><div className="spin" aria-hidden="true" /><h1 style={{ margin: 0, fontSize: 26 }}>{s.wait}</h1><p className="muted" style={{ margin: 0 }}>{s.waitS}</p></>}
        {st === 'ok' && sub && <>
          <span className="ic" style={{ width: 72, height: 72, minWidth: 72, background: '#E3F5EA', color: '#1E7A46' }}><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg></span>
          <h1 style={{ margin: 0, fontSize: 28 }}>{sub.status === 'trialing' ? s.trialT : s.okT(planName)}</h1>
          <p className="muted" style={{ margin: 0 }}>{s.okS}</p>
          <ul className="ticks" style={{ textAlign: 'left' }}>{(s.perks[sub.plan] ?? s.perks.pro).map((x) => <li key={x}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E7A46" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>{x}</li>)}</ul>
          <AccountBox lang={lang} mode="save" />
          <a className="btn red full" href={back}>{isOrg ? s.goBoard : s.goCases}</a>
          <a className="small" href={PORTAL} target="_blank" rel="noopener">{s.manage}</a>
        </>}
        {st === 'slow' && <>
          <h1 style={{ margin: 0, fontSize: 26 }}>{s.slowT}</h1><p className="muted" style={{ margin: 0 }}>{s.slowS}</p>
          <button className="btn full" type="button" onClick={() => { done.current = false; poll(pend); }}>{s.retry}</button>
          <a className="btn ghost full" href={back}>{s.back}</a>
          <span className="muted small">{s.help}</span>
        </>}
        {st === 'none' && <>
          <h1 style={{ margin: 0, fontSize: 26 }}>{s.noneT}</h1><p className="muted" style={{ margin: 0 }}>{s.noneS}</p>
          <a className="btn full" href={`${p.home}#planes`}>{s.plans}</a>
          <a className="btn ghost full" href={PORTAL} target="_blank" rel="noopener">{s.manage}</a>
        </>}
      </div>
    </main>
  );
}
