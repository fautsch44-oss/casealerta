import Link from 'next/link';
import type { Form, Lang, Status } from '@/lib/types';
import { GROUP_LABEL, KIND_LABEL, P, STAGE_LABEL, STAGES, T, other } from '@/lib/i18n';
import {
  FORMS, NEWS, STATUSES, byStage, fName, fShort, formPath, formsFor, newsPath, note, pick, rangeText,
  sTitle, statusPath, statusesFor, w1Path,
} from '@/lib/catalog';
import { Shell, crumbs } from './Shell';
import { Bell, Doc, KindBadge, KindIcon, Shield, Spark } from './Icons';
import Lookup from './Lookup';
import { NewsCards } from './News';

const L = {
  es: {
    meansFor: (f: string) => `Qué significa en tu ${f}`, means: 'Qué significa', next: 'Qué hacer ahora', mistakes: 'Errores comunes',
    wait: '¿Cuánto tarda?', rangeOf: (f: string) => `Rango típico de un ${f} completo`, noRange: 'USCIS no publica un rango único para este formulario: depende de la categoría y la oficina.',
    rangeNote: 'Tiempos publicados por USCIS (mediana al 93 % de los casos). Son rangos típicos, no una fecha exacta.',
    faq: 'Preguntas frecuentes', steps: (f: string) => `Pasos típicos de un ${f}`, otherStatuses: (f: string) => `Otros estatus de tu ${f}`,
    otherForms: 'Este mismo estatus en otros formularios', official: 'Texto oficial en inglés', ctaT: 'Te aviso cuando cambie', ctaS: 'Correo y globo en tu navegador. Sin anuncios.',
    forForm: 'Elige tu formulario para ver la explicación exacta', allStatuses: 'Ver todos los estatus', allForms: 'Ver todos los formularios', officialPage: 'Página oficial del formulario en USCIS',
    statusesTitle: 'Estatus de USCIS explicados', statusesLead: 'Qué significa cada estatus, qué hacer y cuánto suele tardar, en lenguaje claro y por formulario.',
    formsTitle: 'Formularios de USCIS explicados', formsLead: 'Elige tu formulario y entiende cada estatus de tu trámite, paso a paso.',
    whatIs: '¿Qué es este formulario?', statusesOf: (f: string) => `Todos los estatus de un ${f}`, here: 'Estás aquí',
  },
  en: {
    meansFor: (f: string) => `What it means for your ${f}`, means: 'What it means', next: 'What to do now', mistakes: 'Common mistakes',
    wait: 'How long does it take?', rangeOf: (f: string) => `Typical range for a complete ${f}`, noRange: 'USCIS does not publish a single range for this form: it depends on the category and office.',
    rangeNote: 'USCIS published processing times (median to 93% of cases). Typical ranges, never an exact date.',
    faq: 'Frequently asked questions', steps: (f: string) => `Typical steps of an ${f}`, otherStatuses: (f: string) => `Other statuses of your ${f}`,
    otherForms: 'This same status on other forms', official: 'Official text', ctaT: 'I will alert you when it changes', ctaS: 'Email and browser notifications. No ads.',
    forForm: 'Choose your form for the exact explanation', allStatuses: 'See all statuses', allForms: 'See all forms', officialPage: 'Official USCIS form page',
    statusesTitle: 'USCIS case statuses explained', statusesLead: 'What each status means, what to do and how long it usually takes, in plain language and by form.',
    formsTitle: 'USCIS forms explained', formsLead: 'Pick your form and understand every status of your case, step by step.',
    whatIs: 'What is this form?', statusesOf: (f: string) => `Every status of an ${f}`, here: 'You are here',
  },
};

function CtaAlert({ lang }: { lang: Lang }) {
  const l = L[lang];
  return (
    <section className="sec"><div className="card navy ctaBox">
      <span className="ic" style={{ background: 'var(--gold)', color: 'var(--navy)' }}><Bell /></span>
      <div style={{ flex: '1 1 260px' }}><b style={{ fontSize: 20 }}>{l.ctaT}</b><br /><span style={{ color: '#D6E0F2' }}>{l.ctaS}</span></div>
      <Link className="btn red" href={`${P[lang].home}#consulta`}>{T[lang].cta}</Link>
    </div></section>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  return <div className="faq">{items.map((x) => <details key={x.q}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div>;
}

function milestoneIndex(f: Form, st: Status, lang: Lang) {
  const ms = pick(lang, f.milestones_es, f.milestones_en);
  const order = ['intake', 'biometrics', 'review', 'evidence', 'interview', 'decision', 'card', 'closed'];
  const i = order.indexOf(st.stage);
  if (i < 0 || !ms.length) return -1;
  return Math.min(ms.length - 1, Math.round((i / (order.length - 1)) * (ms.length - 1)));
}

/** W1: estatus explicado (con formulario) o estatus genérico (sin formulario). */
export function StatusPage({ lang, st, form }: { lang: Lang; st: Status; form?: Form }) {
  const l = L[lang], t = T[lang], p = P[lang], o = other(lang);
  const title = sTitle(lang, st);
  const meaning = pick(lang, st.meaning_es, st.meaning_en);
  const n = form ? note(form, st, lang) : null;
  const path = form ? w1Path(lang, form, st) : statusPath(lang, st);
  const alt = form ? w1Path(o, form, st) : statusPath(o, st);
  const faqs = [...pick(lang, st.faq_es, st.faq_en)];
  if (form) {
    const r = rangeText(lang, form);
    faqs.unshift({
      q: lang === 'es' ? `¿Qué significa "${st.code}" en un ${form.code}?` : `What does "${st.code}" mean on an ${form.code}?`,
      a: n ?? meaning,
    });
    if (r) faqs.push({ q: lang === 'es' ? `¿Cuánto tarda un ${form.code}?` : `How long does an ${form.code} take?`, a: lang === 'es' ? `El rango típico publicado por USCIS es de ${r}. Depende de la oficina y de tu caso; no es una fecha exacta.` : `The typical range published by USCIS is ${r}. It depends on the office and your case; it is not an exact date.` });
  }
  const siblings = form ? statusesFor(form).filter((x) => x.code !== st.code) : [];
  const near = siblings.filter((x) => x.stage === st.stage).concat(siblings.filter((x) => x.stage !== st.stage)).slice(0, 8);
  const otherForms = formsFor(st).filter((f) => f.slug !== form?.slug).slice(0, form ? 8 : 60);
  const msIdx = form ? milestoneIndex(form, st, lang) : -1;
  const bc: [string, string][] = form
    ? [[t.home, p.home], [t.nav_forms, p.forms], [form.code, formPath(lang, form)], [title, path]]
    : [[t.home, p.home], [t.nav_status, p.status], [title, path]];
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'FAQPage', inLanguage: lang, mainEntity: faqs.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
      crumbs(bc),
      { '@type': 'WebPage', name: title, url: `https://casealerta.com${path}`, inLanguage: lang, dateModified: '2026-10-20', isPartOf: { '@type': 'WebSite', name: 'CaseAlerta', url: 'https://casealerta.com' }, publisher: { '@type': 'Organization', name: 'VARGER Group LLC' } },
    ],
  };
  const h1 = form
    ? (lang === 'es' ? `“${title}” en tu ${form.code}: qué significa` : `“${st.code}” on your ${form.code}: what it means`)
    : `“${title}”`;
  return (
    <Shell lang={lang} alt={alt} jsonld={jsonld}>
      <section className="hero"><div className="wrap grid2"><div className="main">
        <nav className="crumb" aria-label={lang === 'es' ? 'Ruta' : 'Breadcrumb'}>{bc.slice(0, -1).map(([n2, u], i) => <span key={u}>{i > 0 && ' › '}<Link href={u}>{n2}</Link></span>)}</nav>
        <KindBadge k={st.kind} label={KIND_LABEL[lang][st.kind]} />
        <h1 style={{ marginTop: 14 }}>{h1}</h1>
        <p className="lead">{lang === 'es' ? <>Texto oficial en inglés: <b>{st.code}</b>{form && <> · {fName(lang, form)}</>}</> : <>{form ? fName(lang, form) : STAGE_LABEL[lang][st.stage]}</>}</p>
        <div className="bubble" style={{ marginTop: 20 }}><span className="medal"><img src="/sello.png" alt="" width={44} height={44} /></span><div className="say">{n ?? meaning}</div></div>
      </div><div className="side"><Lookup lang={lang} plansHref={`${p.home}#planes`} compact /></div></div></section>

      <main className="wrap main-pull">
        <div className="grid2" style={{ gap: 16 }}>
          <div className="main" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section className="card"><h2>{form ? l.meansFor(form.code) : l.means}</h2>
              {n && <p className="muted small" style={{ fontWeight: 700, margin: '0 0 4px' }}>{lang === 'es' ? `En general, en cualquier formulario:` : 'In general, on any form:'}</p>}
              <p style={{ fontSize: 17, marginTop: 0 }}>{meaning}</p>
              {form && <p className="small muted" style={{ margin: 0 }}>{lang === 'es' ? `Texto oficial en inglés: “${st.code}”. ${fName(lang, form)}.` : `${fName(lang, form)}.`}</p>}</section>
            <section className="card"><h2>{l.next}</h2><ol className="steps">{pick(lang, st.next_es, st.next_en).map((x) => <li key={x}>{x}</li>)}</ol></section>
            <section className="card"><h2>{l.mistakes}</h2><ul className="bul">{pick(lang, st.mistakes_es, st.mistakes_en).map((x) => <li key={x}>{x}</li>)}</ul></section>
          </div>
          <div className="side" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <section className="card"><h2 style={{ fontSize: 20 }}>{l.wait}</h2><p>{pick(lang, st.wait_es, st.wait_en)}</p>
              {form && (rangeText(lang, form)
                ? <><div className="range"><b className="big">{rangeText(lang, form)}</b></div><p className="muted small">{l.rangeOf(form.code)}. {l.rangeNote}</p></>
                : <p className="muted small">{l.noRange}</p>)}
            </section>
            {form && (
              <section className="card"><h2 style={{ fontSize: 20 }}>{l.steps(form.code)}</h2>
                <ol className="timeline">{pick(lang, form.milestones_es, form.milestones_en).map((m, i) => <li key={m} className={i === msIdx ? 'on' : i < msIdx ? 'done' : ''}>{m}{i === msIdx && <small>{l.here}</small>}</li>)}</ol>
              </section>
            )}
          </div>
        </div>

        <section className="sec"><div className="card"><h2>{l.faq}</h2><Faq items={faqs} /></div></section>
        <CtaAlert lang={lang} />

        {form && near.length > 0 && (
          <section className="sec"><h2>{l.otherStatuses(form.code)}</h2>
            <div className="list">{near.map((x) => <Link key={x.code} href={w1Path(lang, form, x)}><KindIcon k={x.kind} size={40} /><span>{sTitle(lang, x)}<small>{STAGE_LABEL[lang][x.stage]}</small></span></Link>)}</div>
            <p><Link href={formPath(lang, form)}>{l.statusesOf(form.code)} →</Link></p></section>
        )}
        {otherForms.length > 0 && (
          <section className="sec"><h2>{form ? l.otherForms : l.forForm}</h2>
            <div className="list">{otherForms.map((f) => <Link key={f.slug} href={w1Path(lang, f, st)}><span className="fcode">{f.code}</span><span>{fShort(lang, f)}<small>{fName(lang, f)}</small></span></Link>)}</div>
            {!form && <p><Link href={p.status}>{l.allStatuses} →</Link></p>}</section>
        )}
        <p className="muted small">{t.ai_note}</p>
      </main>
    </Shell>
  );
}

export function FormPage({ lang, form }: { lang: Lang; form: Form }) {
  const l = L[lang], t = T[lang], p = P[lang], o = other(lang);
  const sts = statusesFor(form);
  const path = formPath(lang, form);
  const r = rangeText(lang, form);
  const bc: [string, string][] = [[t.home, p.home], [t.nav_forms, p.forms], [form.code, path]];
  const faqs = [
    { q: lang === 'es' ? `¿Qué es el formulario ${form.code}?` : `What is Form ${form.code}?`, a: pick(lang, form.what_es, form.what_en) },
    ...(r ? [{ q: lang === 'es' ? `¿Cuánto tarda un ${form.code}?` : `How long does an ${form.code} take?`, a: lang === 'es' ? `El rango típico publicado por USCIS es de ${r}. No es una fecha exacta.` : `The typical range published by USCIS is ${r}. It is not an exact date.` }] : []),
  ];
  const jsonld = { '@context': 'https://schema.org', '@graph': [crumbs(bc), { '@type': 'FAQPage', inLanguage: lang, mainEntity: faqs.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) }] };
  return (
    <Shell lang={lang} alt={formPath(o, form)} jsonld={jsonld}>
      <section className="hero"><div className="wrap grid2"><div className="main">
        <nav className="crumb"><Link href={p.home}>{t.home}</Link> › <Link href={p.forms}>{t.nav_forms}</Link></nav>
        <span className="badge" style={{ background: '#fff', color: 'var(--navy)' }}><Doc s={16} />{GROUP_LABEL[lang][form.group] ?? form.group}</span>
        <h1 style={{ marginTop: 14 }}>{form.code}: {fName(lang, form)}</h1>
        <p className="lead">{pick(lang, form.what_es, form.what_en)}</p>
      </div><div className="side"><Lookup lang={lang} plansHref={`${p.home}#planes`} compact /></div></div></section>
      <main className="wrap main-pull">
        <div className="grid2" style={{ gap: 16 }}>
          <section className="card main"><h2>{l.steps(form.code)}</h2><ol className="timeline">{pick(lang, form.milestones_es, form.milestones_en).map((m) => <li key={m} className="done">{m}</li>)}</ol>
            <p><a href={form.official_url} rel="noopener" target="_blank">{l.officialPage} ↗</a></p></section>
          <section className="card side"><h2 style={{ fontSize: 20 }}>{l.wait}</h2>
            {r ? <><div className="range"><b className="big">{r}</b></div><p className="muted small">{l.rangeNote}</p></> : <p className="muted">{l.noRange}</p>}</section>
        </div>
        {STAGES.map((sg) => {
          const items = sts.filter((x) => x.stage === sg);
          if (!items.length) return null;
          return (
            <section className="sec" key={sg}><h2>{STAGE_LABEL[lang][sg]}</h2>
              <div className="list">{items.map((x) => <Link key={x.code} href={w1Path(lang, form, x)}><KindIcon k={x.kind} size={40} /><span>{sTitle(lang, x)}{lang === 'es' && <small>{x.code}</small>}</span></Link>)}</div></section>
          );
        })}
        <section className="sec"><div className="card"><h2>{l.faq}</h2><Faq items={faqs} /></div></section>
        <CtaAlert lang={lang} />
        <p className="muted small">{t.ai_note}</p>
      </main>
    </Shell>
  );
}

export function FormsIndex({ lang }: { lang: Lang }) {
  const l = L[lang], p = P[lang], o = other(lang);
  const groups = Array.from(new Set(FORMS.map((f) => f.group)));
  return (
    <Shell lang={lang} alt={P[o].forms}>
      <section className="hero slim"><div className="wrap"><h1>{l.formsTitle}</h1><p className="lead">{l.formsLead}</p></div></section>
      <main className="wrap main-pull">
        <div className="card"><div className="list">{FORMS.slice(0, 12).map((f) => <Link key={f.slug} href={formPath(lang, f)}><span className="fcode">{f.code}</span><span>{fShort(lang, f)}<small>{fName(lang, f)}</small></span></Link>)}</div></div>
        {groups.map((g) => (
          <section className="sec" key={g}><h2>{GROUP_LABEL[lang][g] ?? g}</h2>
            <div className="list">{FORMS.filter((f) => f.group === g).map((f) => <Link key={f.slug} href={formPath(lang, f)}><span className="fcode">{f.code}</span><span>{fShort(lang, f)}<small>{fName(lang, f)}</small></span></Link>)}</div></section>
        ))}
        <p><Link href={p.status}>{l.allStatuses} →</Link></p>
      </main>
    </Shell>
  );
}

export function StatusIndex({ lang }: { lang: Lang }) {
  const l = L[lang], p = P[lang], o = other(lang);
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: l.statusesTitle, inLanguage: lang, url: `https://casealerta.com${p.status}` };
  return (
    <Shell lang={lang} alt={P[o].status} jsonld={jsonld}>
      <section className="hero slim"><div className="wrap"><h1>{l.statusesTitle}</h1><p className="lead">{l.statusesLead}</p></div></section>
      <main className="wrap main-pull">
        {STAGES.map((sg, i) => {
          const items = STATUSES.filter((x) => x.stage === sg).sort(byStage);
          if (!items.length) return null;
          return (
            <section className={i === 0 ? '' : 'sec'} key={sg}>{i === 0 ? <div className="card"><h2>{STAGE_LABEL[lang][sg]}</h2><StatusList lang={lang} items={items} /></div>
              : <><h2>{STAGE_LABEL[lang][sg]}</h2><StatusList lang={lang} items={items} /></>}</section>
          );
        })}
        <p><Link href={p.forms}>{l.allForms} →</Link></p>
      </main>
    </Shell>
  );
}

function StatusList({ lang, items }: { lang: Lang; items: Status[] }) {
  return <div className="list">{items.map((x) => <Link key={x.code} href={statusPath(lang, x)}><KindIcon k={x.kind} size={40} /><span>{sTitle(lang, x)}{lang === 'es' && <small>{x.code}</small>}</span></Link>)}</div>;
}

export function Home({ lang }: { lang: Lang }) {
  const es = lang === 'es', t = T[lang], p = P[lang], o = other(lang);
  const popular = ['Case Was Received', 'Case Is Being Actively Reviewed By USCIS', 'Request for Additional Evidence Was Sent', 'Interview Was Scheduled', 'Case Was Approved', 'Card Was Mailed To Me', 'Case Was Transferred And A New Office Has Jurisdiction', 'Fingerprint Fee Was Received']
    .map((c) => STATUSES.find((s) => s.code === c)).filter(Boolean) as Status[];
  const tiles = [
    { I: Bell, bg: '#FCE8EB', fg: '#C8102E', a: es ? 'Aviso al instante' : 'Instant alerts', b: es ? 'Correo y globo en tu navegador o celular cuando cambie tu caso.' : 'Email and browser or phone notifications when your case changes.' },
    { I: Spark, bg: '#FFF4DB', fg: '#9A6400', a: es ? 'Te lo explico' : 'Plain explanations', b: es ? 'Qué significa, qué sigue y cuánto suele tardar, para tu formulario.' : 'What it means, what is next and how long it usually takes, for your form.' },
    { I: Shield, bg: '#E3F5EA', fg: '#1E7A46', a: es ? 'Sin anuncios, nunca' : 'No ads, ever', b: es ? 'No vendemos ni compartimos tus datos. Fuente oficial: USCIS.' : 'We never sell or share your data. Official source: USCIS.' },
  ];
  const how = es
    ? ['Pega tu número de recibo (viene en tu aviso I-797C).', 'Te mostramos el estatus oficial y qué significa para tu formulario.', 'Activa el aviso: te escribimos solo cuando cambie.', 'Pregúntale al asistente lo que no entiendas.']
    : ['Paste your receipt number (on your I-797C notice).', 'See the official status and what it means for your form.', 'Turn on alerts: we only write when it changes.', 'Ask the assistant anything you do not understand.'];
  const plans = [
    { n: es ? 'Gratis' : 'Free', pr: '$0', d: es ? ['Consulta tu caso en la web', 'Explicación por formulario', 'Aviso por correo de 1 caso', 'Asistente con respuestas base'] : ['Check your case on the web', 'Explanation by form', 'Email alert for 1 case', 'Assistant with base answers'] },
    { n: 'Pro', pr: es ? '$9.99/mes' : '$9.99/mo', s: es ? 'o $69.99 al año' : 'or $69.99/year', d: es ? ['Avisos al instante en la app', 'Hasta 5 casos', 'Historia y boletín de visas', 'Asistente con IA'] : ['Instant alerts in the app', 'Up to 5 cases', 'History and visa bulletin', 'AI assistant'], hl: true },
    { n: es ? 'Familia' : 'Family', pr: es ? '$14.99/mes' : '$14.99/mo', s: es ? 'o $99.99 al año' : 'or $99.99/year', d: es ? ['Todo Pro', 'Hasta 15 casos', '3 dispositivos'] : ['Everything in Pro', 'Up to 15 cases', '3 devices'] },
  ];
  const jsonld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'CaseAlerta', url: 'https://casealerta.com', inLanguage: lang, publisher: { '@type': 'Organization', name: 'VARGER Group LLC', url: 'https://casealerta.com', logo: 'https://casealerta.com/sello.png' } },
      { '@type': 'SoftwareApplication', name: 'CaseAlerta', applicationCategory: 'UtilitiesApplication', operatingSystem: 'Web, Android, iOS', offers: [{ '@type': 'Offer', price: '0', priceCurrency: 'USD' }, { '@type': 'Offer', price: '9.99', priceCurrency: 'USD', name: 'Pro' }] },
    ],
  };
  return (
    <Shell lang={lang} alt={P[o].home} jsonld={jsonld}>
      <section className="hero"><div className="wrap grid2"><div className="main">
        <h1>{es ? 'Tu caso de USCIS, claro y a tiempo' : 'Your USCIS case, clear and on time'}</h1>
        <p className="lead">{es ? 'Consulta gratis tu caso, entiende qué significa para tu formulario y recibe un aviso en cuanto cambie. En español y en inglés.' : 'Check your case for free, understand what it means for your form and get an alert the moment it changes. In English and Spanish.'}</p>
        <div className="bubble" style={{ marginTop: 22 }}><span className="medal"><img src="/sello.png" alt="" width={44} height={44} /></span><div className="say">{es ? 'Pega tu número de recibo y te digo cómo va y qué sigue.' : 'Paste your receipt number and I will tell you how it is going and what is next.'}</div></div>
      </div><div className="side"><Lookup lang={lang} plansHref="#planes" /></div></div></section>
      <main className="wrap main-pull">
        <div className="tiles">{tiles.map(({ I, bg, fg, a, b }) => <div className="tile" key={a}><span className="ic" style={{ background: bg, color: fg }}><I /></span><b>{a}</b><span>{b}</span></div>)}</div>
        <section className="sec"><h2>{es ? 'Cómo funciona' : 'How it works'}</h2><ol className="steps">{how.map((x) => <li key={x} style={{ background: '#fff' }}>{x}</li>)}</ol></section>
        <section className="sec"><h2>{es ? 'Elige tu formulario' : 'Choose your form'}</h2>
          <div className="list">{FORMS.slice(0, 12).map((f) => <Link key={f.slug} href={formPath(lang, f)}><span className="fcode">{f.code}</span><span>{fShort(lang, f)}<small>{rangeText(lang, f) ?? fName(lang, f)}</small></span></Link>)}</div>
          <p><Link href={p.forms}>{es ? `Ver los ${FORMS.length} formularios →` : `See all ${FORMS.length} forms →`}</Link></p></section>
        <section className="sec"><h2>{es ? 'Estatus más buscados' : 'Most searched statuses'}</h2>
          <div className="list">{popular.map((s) => <Link key={s.code} href={statusPath(lang, s)}><KindIcon k={s.kind} size={40} /><span>{sTitle(lang, s)}{es && <small>{s.code}</small>}</span></Link>)}</div>
          <p><Link href={p.status}>{es ? `Ver los ${STATUSES.length} estatus →` : `See all ${STATUSES.length} statuses →`}</Link></p></section>
        <section className="sec"><div className="card ctaBox">
          <span className="ic" style={{ background: '#E6EEFA', color: 'var(--blue)' }}><Spark /></span>
          <div style={{ flex: '1 1 260px' }}><b style={{ fontSize: 20 }}>{es ? 'Boletín de visas de este mes' : "This month's visa bulletin"}</b><br /><span className="muted">{es ? 'Fechas por categoría y país, explicadas. Se actualiza solo cada mes.' : 'Dates by category and country, explained. Updates itself every month.'}</span></div>
          <Link className="btn" href={p.bulletin}>{es ? 'Ver boletín' : 'See bulletin'}</Link></div></section>
        <section className="sec" id="planes"><h2>{es ? 'Planes' : 'Plans'}</h2>
          <div className="price">{plans.map((x) => <div key={x.n} className={`card${x.hl ? ' hl' : ''}`}><b style={{ fontSize: 18 }}>{x.n}</b><div><b className="p">{x.pr}</b> {x.s && <span className="muted small">{x.s}</span>}</div><ul className="bul" style={{ marginTop: 10 }}>{x.d.map((d) => <li key={d}>{d}</li>)}</ul></div>)}</div>
          <p className="muted small">{es ? 'Los planes Pro y Familia se contratan dentro de la app (Android en pruebas, iPhone muy pronto). Sin anuncios en ningún plan.' : 'Pro and Family are purchased in the app (Android in testing, iPhone very soon). No ads on any plan.'}</p></section>
        {NEWS.length > 0 && <section className="sec"><h2>{t.nav_news}</h2><NewsCards lang={lang} items={NEWS.slice(0, 3)} /><p><Link href={p.news}>{es ? 'Ver todas las noticias y guías →' : 'See all news and guides →'}</Link></p></section>}
      </main>
    </Shell>
  );
}

export { newsPath };
