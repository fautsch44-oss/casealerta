import Link from 'next/link';
import type { Form, Lang, Status } from '@/lib/types';
import { KIND_COLOR, KIND_LABEL, P, STAGE_LABEL, T, other } from '@/lib/i18n';
import { fName, fShort, formPath, formsFor, note, pick, rangeText, sTitle, statusPath, statusesFor, w1Path } from '@/lib/catalog';
import { Shell, crumbs } from './Shell';
import { KindIcon } from './Icons';
import Lookup from './Lookup';

/* ---------- Íconos del artboard W1 (trazo idéntico) ---------- */
const S = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const I = {
  inbox: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M4 13l2-8h12l2 8" /><path d="M4 13v6h16v-6h-5l-1 2h-4l-1-2z" /></svg>,
  finger: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M12 11v4" /><path d="M8 12a4 4 0 0 1 8 0v3" /><path d="M5 12a7 7 0 0 1 14 0v2" /></svg>,
  search: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>,
  evidence: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2}><path d="M4 4h12l4 4v12H4z" /><path d="M12 9v5M12 17h.01" /></svg>,
  chat: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M4 5h16v11H9l-5 4z" /></svg>,
  check: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.4}><path d="M5 12l5 5 9-10" /></svg>,
  card: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="11" r="2" /><path d="M14 10h4M14 13h3" /></svg>,
  flag: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M5 21V4h11l-2 4 2 4H5" /></svg>,
  globe: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>,
  doc: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6" /></svg>,
  mail: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  folder: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M3 6h6l2 2h10v11H3z" /></svg>,
  send: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></svg>,
  x: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.6}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  clock: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  bell: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  alert: (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.4}><path d="M12 3l10 18H2z" /><path d="M12 10v5" /></svg>,
};

/** Ícono y etapa de cada hito del formulario, por palabras clave. */
function milestoneMeta(text: string): { icon: keyof typeof I; stage: string } {
  const t = text.toLowerCase();
  if (/recib|receipt|present|filed|fil(ing)?\b|envío inicial/.test(t)) return { icon: 'inbox', stage: 'intake' };
  if (/huell|biom|fingerprint/.test(t)) return { icon: 'finger', stage: 'biometrics' };
  if (/evidenc|rfe|pruebas|evidence/.test(t)) return { icon: 'evidence', stage: 'evidence' };
  if (/entrevist|interview/.test(t)) return { icon: 'chat', stage: 'interview' };
  if (/juram|oath|ceremon/.test(t)) return { icon: 'flag', stage: 'interview' };
  if (/nvc|consul|embaj|embassy|state|estado/.test(t)) return { icon: 'globe', stage: 'decision' };
  if (/tarjeta|card|green|ead|permiso|certificad|certificate|documento|document|mailed|enviad/.test(t)) return { icon: 'card', stage: 'card' };
  if (/decisi|aprob|approv|decision/.test(t)) return { icon: 'check', stage: 'decision' };
  if (/revis|review|proces/.test(t)) return { icon: 'search', stage: 'review' };
  return { icon: 'doc', stage: 'review' };
}
const ORDER = ['intake', 'biometrics', 'review', 'evidence', 'interview', 'decision', 'card', 'closed', 'admin'];

function currentStep(ms: string[], st: Status) {
  const metas = ms.map(milestoneMeta);
  const exact = metas.findIndex((m) => m.stage === st.stage);
  if (exact >= 0) return exact;
  if (st.stage === 'closed' || st.stage === 'admin') return -1;
  const target = ORDER.indexOf(st.stage);
  let best = -1;
  metas.forEach((m, i) => { if (ORDER.indexOf(m.stage) <= target) best = i; });
  return best;
}

const firstSentence = (s: string) => { const m = s.match(/^.+?[.!?](\s|$)/); return (m ? m[0] : s).trim(); };

const L = {
  es: {
    where: '¿EN QUÉ PASO VAS?', here: 'aquí', todo: (n: number) => `Qué hacer, en ${n} pasos`, avoid: 'Evita estos errores', quick: 'Preguntas rápidas',
    deadline: 'Tu plazo', deadlineSub: 'El que dice tu carta. No lo dejes pasar.', letter: 'carta',
    typical: (f: string) => `Tiempo típico de un ${f} completo`, months: 'meses', thisStatus: 'En este estatus',
    noRange: 'USCIS no publica un rango único para este formulario.', ctaT: 'Te aviso cuando cambie', ctaS: 'Correo y globo en tu navegador · sin anuncios', cta: 'Activar alertas',
    means: (f: string) => `Lo que significa para tu ${f}`, general: 'En general, en cualquier formulario', official: 'Texto oficial en inglés',
    others: (f: string) => `Otros estatus de tu ${f}`, sameOther: 'Este mismo estatus en otros formularios', choose: 'Elige tu formulario para ver la explicación exacta',
    all: (f: string) => `Todos los estatus de un ${f} →`, rangeNote: 'Tiempos publicados por USCIS. Son rangos típicos, nunca una fecha exacta.',
  },
  en: {
    where: 'WHICH STEP ARE YOU ON?', here: 'here', todo: (n: number) => `What to do, in ${n} steps`, avoid: 'Avoid these mistakes', quick: 'Quick questions',
    deadline: 'Your deadline', deadlineSub: 'The one on your letter. Do not miss it.', letter: 'letter',
    typical: (f: string) => `Typical time for a complete ${f}`, months: 'months', thisStatus: 'In this status',
    noRange: 'USCIS does not publish a single range for this form.', ctaT: 'I will alert you when it changes', ctaS: 'Email and browser notifications · no ads', cta: 'Turn on alerts',
    means: (f: string) => `What it means for your ${f}`, general: 'In general, on any form', official: 'Official text',
    others: (f: string) => `Other statuses of your ${f}`, sameOther: 'This same status on other forms', choose: 'Choose your form for the exact explanation',
    all: (f: string) => `Every status of an ${f} →`, rangeNote: 'USCIS published times. Typical ranges, never an exact date.',
  },
};

const STEP_ICONS: (keyof typeof I)[] = ['mail', 'folder', 'send', 'check', 'clock'];
const STEP_COLORS = [['#E6EEFA', '#1F4FA0'], ['#FFF4DB', '#9A6400'], ['#E3F5EA', '#1E7A46'], ['#FCE8EB', '#C8102E'], ['#E6EEFA', '#1F4FA0']];

export function W1({ lang, st, form }: { lang: Lang; st: Status; form?: Form }) {
  const l = L[lang], t = T[lang], p = P[lang], o = other(lang);
  const title = sTitle(lang, st);
  const meaning = pick(lang, st.meaning_es, st.meaning_en);
  const n = form ? note(form, st, lang) : null;
  const path = form ? w1Path(lang, form, st) : statusPath(lang, st);
  const alt = form ? w1Path(o, form, st) : statusPath(o, st);
  const kc = KIND_COLOR[st.kind];
  const steps = pick(lang, st.next_es, st.next_en);
  const mistakes = pick(lang, st.mistakes_es, st.mistakes_en);
  const faqs = [...pick(lang, st.faq_es, st.faq_en)];
  const range = form ? rangeText(lang, form) : null;
  if (form) {
    faqs.unshift({ q: lang === 'es' ? `¿Qué significa "${st.code}" en un ${form.code}?` : `What does "${st.code}" mean on an ${form.code}?`, a: n ?? meaning });
    if (range) faqs.push({ q: lang === 'es' ? `¿Cuánto tarda un ${form.code}?` : `How long does an ${form.code} take?`, a: lang === 'es' ? `El rango típico publicado por USCIS es de ${range}. Depende de la oficina y de tu caso; no es una fecha exacta.` : `The typical range published by USCIS is ${range}. It depends on the office and your case; it is not an exact date.` });
  }
  let ms = form ? [...pick(lang, form.milestones_es, form.milestones_en)] : [];
  let cur = form ? currentStep(ms, st) : -1;
  // El estatus cae en una etapa que el formulario no lista (p. ej. RFE): se dibuja como paso propio, donde corresponde.
  if (form && ms.length && ['evidence', 'interview'].includes(st.stage) && !ms.some((m) => milestoneMeta(m).stage === st.stage)) {
    const label = st.stage === 'evidence' ? (lang === 'es' ? 'Pruebas (RFE)' : 'Evidence (RFE)') : (lang === 'es' ? 'Entrevista' : 'Interview');
    const at = Math.max(1, cur + 1);
    ms = [...ms.slice(0, at), label, ...ms.slice(at)];
    cur = at;
  }
  const siblings = form ? statusesFor(form).filter((x) => x.code !== st.code) : [];
  const near = siblings.filter((x) => x.stage === st.stage).concat(siblings.filter((x) => x.stage !== st.stage)).slice(0, 9);
  const otherForms = formsFor(st).filter((f) => f.slug !== form?.slug).slice(0, form ? 9 : 60);
  const bc: [string, string][] = form ? [[t.home, p.home], [`${form.code} · ${fShort(lang, form)}`, formPath(lang, form)], [title, path]] : [[t.home, p.home], [t.nav_status, p.status], [title, path]];
  const isAct = st.kind === 'act' || st.kind === 'bad';
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'FAQPage', inLanguage: lang, mainEntity: faqs.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
    crumbs(bc),
    { '@type': 'HowTo', name: l.todo(steps.length), inLanguage: lang, step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })) },
  ] };
  const ringMax = form?.typical_months_max ?? null;

  return (
    <Shell lang={lang} alt={alt} jsonld={jsonld}>
      {/* HERO (artboard W1) */}
      <section className="hero" style={{ paddingBottom: 70 }}><div className="wrap grid2" style={{ alignItems: 'center' }}>
        <div className="main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <nav aria-label={lang === 'es' ? 'Ruta' : 'Breadcrumb'} className="crumb" style={{ margin: 0 }}>{bc.slice(0, -1).map(([n2, u], i) => <span key={u}>{i > 0 && ' › '}<Link href={u}>{n2}</Link></span>)}</nav>
          <span className="badge" style={{ alignSelf: 'flex-start', background: isAct ? '#C8102E' : kc.bg, color: isAct ? '#fff' : kc.fg }}>{isAct ? I.alert(16) : I.check(16)}{KIND_LABEL[lang][st.kind]}</span>
          <h1 style={{ margin: 0, fontSize: 'clamp(28px,4.5vw,40px)' }}>&ldquo;{lang === 'es' ? st.code : st.code}&rdquo;{form && <span style={{ display: 'block', fontSize: '0.55em', fontWeight: 700, color: '#D6E0F2', marginTop: 8 }}>{lang === 'es' ? `${title} · en tu ${form.code}` : `on your ${form.code} · ${fShort(lang, form)}`}</span>}</h1>
          <div className="bubble"><span className="medal" style={{ width: 62, height: 62, minWidth: 62 }}><img src="/sello.png" alt="" width={52} height={52} /></span>
            <div className="say" style={{ fontSize: 18, lineHeight: 1.4 }}>{firstSentence(n ?? meaning)}</div></div>
        </div>
        <div className="side"><Lookup lang={lang} plansHref={`${p.home}#planes`} compact /></div>
      </div></section>

      <main className="wrap" style={{ marginTop: -40, position: 'relative', display: 'flex', flexDirection: 'column', gap: 28, paddingBottom: 64 }}>
        <div id="lookup-slot" />

        {/* ¿EN QUÉ PASO VAS? */}
        {form && ms.length > 0 && (
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.6px', color: 'var(--muted)' }}>{l.where}</span>
            <div className="stepper">
              {ms.map((m, i) => {
                const meta = milestoneMeta(m);
                const done = cur >= 0 && i < cur, now = i === cur;
                return (
                  <div key={m} className="stepWrap">
                    {i > 0 && <span className="stepLine" style={{ background: cur >= 0 && i <= cur ? 'var(--blue)' : 'var(--line)' }} />}
                    <div className="step" style={{ opacity: !done && !now ? 0.55 : 1 }}>
                      <span className={`stepDot${now ? ' now' : done ? ' done' : ''}`}>{I[meta.icon](now ? 28 : 24)}</span>
                      <span style={{ fontSize: 13, fontWeight: now ? 800 : 700, color: now ? 'var(--red)' : undefined, textAlign: 'center' }}>{m}{now && ` · ${l.here}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* QUÉ HACER, EN N PASOS */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>{l.todo(steps.length)}</h2>
          <div className="todo">
            {steps.map((s, i) => {
              const [bg, fg] = STEP_COLORS[i % STEP_COLORS.length];
              return (
                <div key={s} className="tile" style={{ gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="ic" style={{ background: bg, color: fg }}>{I[STEP_ICONS[i % STEP_ICONS.length]](28)}</span>
                    <span style={{ fontSize: 40, fontWeight: 800, color: 'var(--line)' }} aria-hidden="true">{i + 1}</span>
                  </div>
                  <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1.35, color: 'var(--navy)' }}>{s}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* PLAZO + TIEMPO */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div className="tile" style={{ flex: '1 1 300px', flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            {isAct ? (
              <div className="ring" style={{ background: 'conic-gradient(#1F4FA0 0 10%, #C8102E 10% 100%)' }}><div><span className="ringBig">{I.evidence(30)}</span><span className="ringSmall">{l.letter}</span></div></div>
            ) : (
              <div className="ring" style={{ background: ringMax ? 'conic-gradient(#1F4FA0 0 62%, #D6E0F2 62% 100%)' : '#E6EEFA' }}><div><span className="ringBig">{ringMax ?? '—'}</span><span className="ringSmall">{l.months}</span></div></div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {isAct ? <><b style={{ fontSize: 17 }}>{l.deadline}</b><span className="muted" style={{ fontSize: 14 }}>{l.deadlineSub}</span></>
                : form ? <><b style={{ fontSize: 17 }}>{range ?? l.noRange}</b><span className="muted" style={{ fontSize: 14 }}>{l.typical(form.code)}. {l.rangeNote}</span></>
                : <><b style={{ fontSize: 17 }}>{l.thisStatus}</b><span className="muted" style={{ fontSize: 14 }}>{pick(lang, st.wait_es, st.wait_en)}</span></>}
            </div>
          </div>
          <div className="tile" style={{ flex: '1 1 300px', flexDirection: 'row', alignItems: 'center', gap: 18 }}>
            <span className="ic" style={{ width: 70, height: 70, minWidth: 70, background: '#E3F5EA', color: '#1E7A46' }}>{I.clock(34)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 17 }}>{l.thisStatus}</b><span className="muted" style={{ fontSize: 14 }}>{pick(lang, st.wait_es, st.wait_en)}</span></div>
          </div>
        </div>

        {/* LO QUE SIGNIFICA (contenido completo) */}
        <section className="card"><h2 style={{ marginTop: 0 }}>{form ? l.means(form.code) : l.general}</h2>
          {n && <p style={{ fontSize: 17 }}>{n}</p>}
          {n && <p className="muted small" style={{ fontWeight: 700, margin: '14px 0 4px' }}>{l.general}:</p>}
          <p style={{ fontSize: n ? 15 : 17, margin: 0 }}>{meaning}</p>
          {lang === 'es' && <p className="muted small" style={{ marginBottom: 0 }}>{l.official}: &ldquo;{st.code}&rdquo;{form && ` · ${fName(lang, form)}`}</p>}
        </section>

        {/* EVITA ESTOS ERRORES */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>{l.avoid}</h2>
          <div className="todo">
            {mistakes.map((m) => (
              <div key={m} style={{ background: '#FCE8EB', borderRadius: 20, padding: 18, display: 'flex', gap: 12, alignItems: 'center' }}>
                <span className="ic" style={{ width: 44, height: 44, minWidth: 44, background: '#C8102E', color: '#fff' }}>{I.x(22)}</span>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{m}</span>
              </div>
            ))}
          </div>
        </section>

        {/* PREGUNTAS RÁPIDAS (burbujas) */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>{l.quick}</h2>
          {faqs.map((x) => (
            <div key={x.q} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}><h3 className="qMe">{x.q}</h3></div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}><img src="/sello.png" alt="" width={36} height={36} /><p className="qBot">{x.a}</p></div>
            </div>
          ))}
        </section>

        {/* CTA */}
        <div className="card navy ctaBox" style={{ borderRadius: 26, padding: 26 }}>
          <span className="ic" style={{ width: 64, height: 64, background: 'var(--gold)', color: 'var(--navy)' }}>{I.bell(30)}</span>
          <div style={{ flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: 4 }}><b style={{ fontSize: 20 }}>{l.ctaT}</b><span style={{ fontSize: 14, color: '#D6E0F2' }}>{l.ctaS}</span></div>
          <a className="btn red" href="#consulta">{l.cta}</a>
        </div>

        {form && near.length > 0 && (
          <section><h2 style={{ fontSize: 22 }}>{l.others(form.code)}</h2>
            <div className="list">{near.map((x) => <Link key={x.code} href={w1Path(lang, form, x)}><KindIcon k={x.kind} size={40} /><span>{sTitle(lang, x)}<small>{STAGE_LABEL[lang][x.stage]}</small></span></Link>)}</div>
            <p><Link href={formPath(lang, form)}>{l.all(form.code)}</Link></p></section>
        )}
        {otherForms.length > 0 && (
          <section><h2 style={{ fontSize: 22 }}>{form ? l.sameOther : l.choose}</h2>
            <div className="list">{otherForms.map((f) => <Link key={f.slug} href={w1Path(lang, f, st)}><span className="fcode">{f.code}</span><span>{fShort(lang, f)}<small>{fName(lang, f)}</small></span></Link>)}</div></section>
        )}
        <p className="muted small">{t.ai_note}</p>
      </main>
    </Shell>
  );
}
