'use client';
// Planes de la web con cobro real (Stripe). Anual al frente, tarjetas con el mismo formato, salida siempre visible.
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/types';
import { P } from '@/lib/i18n';
import { PLAN_NAME, PORTAL, checkout, mySubs, type Interval, type MySub, type PlanKey } from '@/lib/billing';
import { track } from './Analytics';

const S = {
  es: {
    title: 'Planes', month: 'Mensual', year: 'Anual', save: (n: number) => `Ahorra ${n} %`, per: { month: '/mes', year: '/año' },
    perMonth: (x: string) => `equivale a ${x}/mes`, free: 'Gratis', freeCta: 'Consultar mi caso', choose: (n: string) => `Elegir ${n}`, opening: 'Abriendo pago seguro…',
    best: 'El más elegido', yours: 'Tu plan', manage: 'Administrar mi plan', fail: 'No pudimos abrir el pago. Revisa tu conexión e intenta de nuevo.',
    freeD: ['Consulta tu caso (5 recibos al día)', 'Qué significa y qué sigue', 'Asistente básico (3 preguntas al día)'],
    proD: ['Te avisamos al instante: globo y correo', 'Vigila hasta 5 casos', 'Consultas sin límite', 'Asistente con IA para tus dudas'],
    famD: ['Todo lo de Pro', 'Vigila hasta 15 casos', 'Para toda la familia', 'Sin anuncios'],
    trust: ['Pago seguro con Stripe', 'Cancela cuando quieras', 'Sin anuncios en ningún plan'],
    paid: '¿Ya pagaste en otro navegador?', terms: 'Términos', privacy: 'Privacidad',
    b2b: '¿Empresa o despacho? Tablero de peticiones con 14 días de prueba →',
  },
  en: {
    title: 'Plans', month: 'Monthly', year: 'Yearly', save: (n: number) => `Save ${n}%`, per: { month: '/mo', year: '/yr' },
    perMonth: (x: string) => `just ${x}/mo`, free: 'Free', freeCta: 'Check my case', choose: (n: string) => `Choose ${n}`, opening: 'Opening secure checkout…',
    best: 'Most popular', yours: 'Your plan', manage: 'Manage my plan', fail: 'We could not open checkout. Check your connection and try again.',
    freeD: ['Check your case (5 receipts a day)', 'What it means and what is next', 'Basic assistant (3 questions a day)'],
    proD: ['Instant alerts: push and email', 'Watch up to 5 cases', 'Unlimited checks', 'AI assistant for your questions'],
    famD: ['Everything in Pro', 'Watch up to 15 cases', 'For the whole family', 'No ads'],
    trust: ['Secure payment with Stripe', 'Cancel anytime', 'No ads on any plan'],
    paid: 'Already paid in another browser?', terms: 'Terms', privacy: 'Privacy',
    b2b: 'Company or law firm? Petitions dashboard with a 14-day trial →',
  },
};

const Check = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1E7A46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10" /></svg>;

export default function Plans({ lang }: { lang: Lang }) {
  const s = S[lang], p = P[lang];
  const [iv, setIv] = useState<Interval>('year');
  const [busy, setBusy] = useState<PlanKey | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [mine, setMine] = useState<MySub | null>(null);
  const ref = useRef<HTMLElement>(null);
  const seen = useRef(false);

  useEffect(() => {
    mySubs().then((x) => setMine(x[0] ?? null));
    // Al volver de Stripe con «Atrás», el navegador puede restaurar la página con el botón apagado: se reactiva.
    const reset = () => setBusy(null);
    window.addEventListener('pageshow', reset);
    const el = ref.current;
    const io = el && 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting) && !seen.current) { seen.current = true; track('paywall_viewed', { reason: 'home_plans' }); }
    }, { threshold: 0.35 }) : null;
    if (el && io) io.observe(el);
    return () => { window.removeEventListener('pageshow', reset); io?.disconnect(); };
  }, []);

  async function go(plan: PlanKey) {
    if (busy) return;
    setErr(null); setBusy(plan);
    const ok = await checkout(plan, iv, { lang, from: `${p.home}#planes`, reason: 'home_plans' });
    if (!ok) { setBusy(null); setErr(s.fail); }
  }

  const money = (n: number) => `$${n.toFixed(2)}`;
  const cards: { k: 'free' | PlanKey; name: string; price: string; sub: string; d: string[]; hl?: boolean }[] = [
    { k: 'free', name: s.free, price: '$0', sub: '', d: s.freeD },
    { k: 'pro', name: 'Pro', price: iv === 'year' ? '$69.99' : '$9.99', sub: iv === 'year' ? s.perMonth(money(69.99 / 12)) : '', d: s.proD, hl: true },
    { k: 'family', name: PLAN_NAME[lang].family, price: iv === 'year' ? '$99.99' : '$14.99', sub: iv === 'year' ? s.perMonth(money(99.99 / 12)) : '', d: s.famD },
  ];

  return (
    <section className="sec" id="planes" ref={ref} aria-labelledby="planes-t">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2 id="planes-t" style={{ margin: 0 }}>{s.title}</h2>
        <div className="seg" role="radiogroup" aria-label={s.title}>
          {(['month', 'year'] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={iv === k} className={iv === k ? 'on' : ''} onClick={() => setIv(k)}>
              {k === 'month' ? s.month : s.year}{k === 'year' && <span className="save">{s.save(41)}</span>}
            </button>
          ))}
        </div>
      </div>

      {mine && (
        <div className="card mine" role="status">
          <span className="pill g">{s.yours}: {PLAN_NAME[lang][mine.plan] ?? mine.plan}</span>
          <a className="btn ghost small" href={PORTAL} target="_blank" rel="noopener">{s.manage}</a>
        </div>
      )}

      <div className="price" style={{ marginTop: 14 }}>
        {cards.map((c) => {
          const isMine = !!mine && mine.plan === c.k;
          return (
            <div key={c.k} className={`card plan${c.hl ? ' hl' : ''}`}>
              <div className="planTop"><b style={{ fontSize: 18 }}>{c.name}</b>{c.hl && <span className="pill g small">{s.best}</span>}</div>
              <div className="planPrice"><b className="p">{c.price}</b>{c.k !== 'free' && <span className="muted small">{s.per[iv]}</span>}</div>
              <div className="muted small planSub">{c.sub || ' '}</div>
              <ul className="ticks">{c.d.map((d) => <li key={d}><Check />{d}</li>)}</ul>
              {c.k === 'free'
                ? <a className="btn ghost full" href="#consulta">{s.freeCta}</a>
                : isMine
                  ? <a className="btn ghost full" href={PORTAL} target="_blank" rel="noopener">{s.manage}</a>
                  : <button type="button" className={`btn full${c.hl ? ' red' : ''}`} disabled={busy !== null} aria-busy={busy === c.k} onClick={() => go(c.k as PlanKey)}>{busy === c.k ? s.opening : s.choose(c.name)}</button>}
            </div>
          );
        })}
      </div>
      {err && <p className="err" role="alert">{err}</p>}
      <div className="chips" style={{ marginTop: 12 }}>{s.trust.map((x) => <span className="chip" key={x}>{x}</span>)}</div>
      <p className="muted small" style={{ marginTop: 8 }}>
        {s.paid} <a href={PORTAL} target="_blank" rel="noopener">{s.manage}</a> · <a href={p.terms}>{s.terms}</a> · <a href={p.privacy}>{s.privacy}</a>
      </p>
      <p style={{ margin: '4px 0 0' }}><a href={p.dashboard} style={{ fontWeight: 700 }}>{s.b2b}</a></p>
    </section>
  );
}
