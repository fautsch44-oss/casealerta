import Link from 'next/link';
import type { Lang } from '@/lib/types';
import { P, T, fdate, other } from '@/lib/i18n';
import type { Cert, Employer } from '@/lib/employers';
import { summarize } from '@/lib/employers';
import { Shell, crumbs } from './Shell';
import LeadForm from './LeadForm';

const S = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const leaf = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M12 21v-9" /><path d="M12 12C12 7 8 5 4 5c0 4 3 7 8 7z" /><path d="M12 12c0-4 3-6 7-6 0 4-3 6-7 6z" /></svg>;
const box = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M21 8l-9-5-9 5 9 5z" /><path d="M3 8v8l9 5 9-5V8" /></svg>;
const people = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /><path d="M15.5 14.2c3 .3 5.5 2.6 5.5 5.8" /></svg>;
const sheet = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><path d="M4 4h16v16H4z" /><path d="M8 9h8M8 13h6" /></svg>;
const check = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.4}><path d="M5 12l5 5 9-10" /></svg>;
const cal = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;
const pin = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.4}><path d="M12 21s-7-6-7-12a7 7 0 0 1 14 0c0 6-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>;
const minus = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2}><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></svg>;
const up = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} stroke="#D4A84B"><path d="M12 20V8M7 13l5-5 5 5" /><path d="M4 4h16" /></svg>;
const bellG = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} stroke="#D4A84B"><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /></svg>;
const down = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2} stroke="#D4A84B"><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></svg>;
const pdf = (s: number) => <svg width={s} height={s} viewBox="0 0 24 24" {...S} strokeWidth={2.2}><path d="M4 4h12l4 4v12H4z" /><path d="M8 12h8M8 16h5" /></svg>;

const L = {
  es: {
    emp: 'Empleadores', data: 'Datos públicos del DOL', workers: (y: number) => `Trabajadores ${y}`, apps: 'Solicitudes', cert: 'Certificadas', yrs: 'años', spons: 'Patrocinando',
    perYear: 'Trabajadores certificados por año fiscal', certsOf: (y: number) => `Certificaciones ${y}`, nearby: (p: string) => `Otros empleadores ${p} cerca`,
    yours: '¿Es tu empresa?', board: 'Ve la petición de cada trabajador en un solo tablero', p1: 'Sube hasta 50 recibos', p2: 'Aviso en menos de 5 minutos', p3: 'Exporta para tu abogado',
    trial: '14 días gratis · luego $99/mes', report: 'Reporte PDF gratis', email: 'Correo del trabajo', send: 'Enviármelo', workersW: 'trabajadores', partial: 'parcial', denied: 'negada', withdrawn: 'retirada',
    foot: 'Datos: Departamento de Trabajo de EE.UU. (OFLC), información pública. CaseAlerta (VARGER Group LLC) no está afiliada al DOL ni a USCIS.',
    fy: 'AF', source: 'Fuente: divulgación trimestral de la OFLC por año fiscal (octubre a septiembre).',
  },
  en: {
    emp: 'Employers', data: 'Public DOL data', workers: (y: number) => `Workers ${y}`, apps: 'Applications', cert: 'Certified', yrs: 'yrs', spons: 'Sponsoring',
    perYear: 'Workers certified per fiscal year', certsOf: (y: number) => `${y} certifications`, nearby: (p: string) => `Nearby ${p} employers`,
    yours: 'Is this your company?', board: "See every worker's petition in one board", p1: 'Upload up to 50 receipts', p2: 'Alerts in under 5 minutes', p3: 'Export for your attorney',
    trial: '14 days free · then $99/mo', report: 'Free PDF report', email: 'Work email', send: 'Send it', workersW: 'workers', partial: 'partial', denied: 'denied', withdrawn: 'withdrawn',
    foot: 'Data: U.S. Department of Labor (OFLC), public information. CaseAlerta (VARGER Group LLC) is not affiliated with DOL or USCIS.',
    fy: 'FY', source: 'Source: OFLC quarterly disclosure data by fiscal year (October–September).',
  },
};

export function employerPath(lang: Lang, slug: string) { return `${P[lang].employer}${slug}/`; }

export function W2({ lang, e, certs, near }: { lang: Lang; e: Employer; certs: Cert[]; near: Employer[] }) {
  const l = L[lang], t = T[lang], p = P[lang], o = other(lang);
  const s = summarize(certs);
  const max = Math.max(1, ...s.byYear.map((x) => x.w));
  const isAg = s.programs.includes('H-2A');
  const path = employerPath(lang, e.slug);
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    crumbs([[l.emp, p.employers], [e.state ?? '', `${p.employers}?estado=${e.state ?? ''}`], [e.name, path]]),
    { '@type': 'Organization', name: e.name, address: { '@type': 'PostalAddress', addressLocality: e.city, addressRegion: e.state, addressCountry: 'US' } },
    { '@type': 'Dataset', name: `${e.name} — ${s.programs.join(', ')} ${lang === 'es' ? 'certificaciones' : 'certifications'}`, creator: { '@type': 'Organization', name: 'CaseAlerta' }, isBasedOn: 'https://www.dol.gov/agencies/eta/foreign-labor/performance' },
  ] };
  const kpis = [
    { icon: people(24), bg: '#E6EEFA', fg: '#1F4FA0', v: s.workersLast.toLocaleString(lang), k: l.workers(s.last ?? 0) },
    { icon: sheet(24), bg: '#FFF4DB', fg: '#9A6400', v: s.applications.toLocaleString(lang), k: l.apps },
    { icon: check(24), bg: '#E3F5EA', fg: '#1E7A46', v: `${s.pctCertified}%`, k: l.cert },
    { icon: cal(24), bg: '#FCE8EB', fg: '#C8102E', v: `${s.yearsSponsoring} ${l.yrs}`, k: l.spons },
  ];
  return (
    <Shell lang={lang} alt={employerPath(o, e.slug)} jsonld={jsonld}>
      <section className="hero" style={{ padding: '36px 0 76px' }}><div className="wrap" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <nav className="crumb" style={{ margin: 0 }}><Link href={p.employers}>{l.emp}</Link> › <Link href={`${p.employers}?estado=${e.state ?? ''}`}>{e.state}</Link>{e.county && <> › <span>{e.county}</span></>}</nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <span style={{ width: 76, height: 76, borderRadius: 22, background: '#fff', color: isAg ? '#1E7A46' : '#9A6400', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isAg ? leaf(40) : box(40)}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 'clamp(28px,4.5vw,38px)' }}>{e.name}</h1>
            <div className="row">
              {e.city && <span className="pill w">{pin(14)}{e.city}, {e.state}</span>}
              {s.programs.map((x) => <span key={x} className="pill g">{x}</span>)}
              <span className="pill w">{l.data}</span>
            </div>
          </div>
        </div>
      </div></section>
      <main className="wrap" style={{ marginTop: -48, position: 'relative', display: 'flex', flexDirection: 'column', gap: 24, paddingBottom: 64 }}>
        <div className="kpis">{kpis.map((x) => (
          <div key={x.k} className="tile" style={{ gap: 10, padding: 18 }}><span className="ic" style={{ width: 46, height: 46, minWidth: 46, background: x.bg, color: x.fg }}>{x.icon}</span><b style={{ fontSize: 32, lineHeight: 1 }}>{x.v}</b><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)' }}>{x.k}</span></div>
        ))}</div>
        <div className="grid2" style={{ gap: 20 }}>
          <div className="main" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <b style={{ fontSize: 18 }}>{l.perYear}</b>
              <div className="bars" role="img" aria-label={s.byYear.map((x) => `${l.fy}${x.y}: ${x.w}`).join(', ')}>
                {s.byYear.map((x, i) => {
                  const lastOne = i === s.byYear.length - 1;
                  const shade = lastOne ? '#1F4FA0' : x.w / max > 0.7 ? '#5C80C4' : x.w / max > 0.45 ? '#9DB4DE' : '#D6E0F2';
                  return <div key={x.y} className="bar"><span style={{ fontSize: 12, fontWeight: 800, color: lastOne ? 'var(--blue)' : undefined }}>{x.w}</span><span style={{ height: `${Math.max(4, (x.w / max) * 96)}%`, background: shade }} className="barFill" /><span style={{ fontSize: 12, fontWeight: lastOne ? 800 : 700, color: lastOne ? 'var(--blue)' : 'var(--muted)' }}>{x.y}</span></div>;
                })}
              </div>
              <span className="muted small">{l.source}</span>
            </div>
            {s.lastCerts.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><b style={{ fontSize: 18 }}>{l.certsOf(s.last)}</b>
                <div className="certs">{s.lastCerts.slice(0, 12).map((c, i) => {
                  const ok = /certified$/i.test(c.case_status ?? '') || /^certified/i.test(c.case_status ?? '') && !/partial/i.test(c.case_status ?? '');
                  const partial = /partial/i.test(c.case_status ?? '');
                  const [bg, fg] = ok ? ['#E3F5EA', '#1E7A46'] : partial ? ['#FFF4DB', '#9A6400'] : ['#FCE8EB', '#C8102E'];
                  return (
                    <div key={i} className="tile" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 }}>
                      <span className="ic" style={{ width: 44, height: 44, minWidth: 44, background: bg, color: fg }}>{ok ? (isAg ? leaf(22) : box(22)) : minus(22)}</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: 15, fontWeight: 800 }}>{c.workers_certified ?? 0} · {(c.job_title ?? '').toLowerCase()}{partial ? ` · ${l.partial}` : ''}</span>
                        <span className="muted" style={{ fontSize: 12 }}>{c.decision_date ? fdate(lang, c.decision_date) : ''}{c.worksite_city ? ` · ${c.worksite_city}` : ''}</span>
                      </div>
                    </div>
                  );
                })}</div>
              </section>
            )}
            {near.length > 0 && (
              <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><b style={{ fontSize: 18 }}>{l.nearby(s.programs[0] ?? '')}</b>
                <div className="row">{near.map((x) => <Link key={x.slug} className="chipLink" href={employerPath(lang, x.slug)}>{pin(16)}{x.name}</Link>)}</div></section>
            )}
          </div>
          <aside className="side" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card navy" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="bubble"><span className="medal" style={{ width: 58, height: 58, minWidth: 58 }}><img src="/sello.png" alt="" width={48} height={48} /></span><div className="say" style={{ fontSize: 14, fontWeight: 700, padding: '10px 14px' }}>{l.yours}</div></div>
              <b style={{ fontSize: 20, lineHeight: 1.25 }}>{l.board}</b>
              {[[up(18), l.p1], [bellG(18), l.p2], [down(18), l.p3]].map(([ic, tx], i) => <span key={i} className="row" style={{ gap: 10, fontSize: 14, fontWeight: 600 }}><span className="ic" style={{ width: 34, height: 34, minWidth: 34, background: 'rgba(255,255,255,0.14)' }}>{ic}</span>{tx}</span>)}
              <Link className="btn red" href={`${p.dashboard}?empresa=${e.slug}`}>{l.trial}</Link>
            </div>
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span className="row" style={{ gap: 10, fontSize: 15, fontWeight: 800 }}><span className="ic" style={{ width: 40, height: 40, minWidth: 40, background: '#FFF4DB', color: '#9A6400' }}>{pdf(20)}</span>{l.report}</span>
              <LeadForm lang={lang} slug={e.slug} label={l.email} cta={l.send} />
            </div>
          </aside>
        </div>
        <p className="muted small">{l.foot} {t.footer}</p>
      </main>
    </Shell>
  );
}

export function W2Index({ lang, list, total, state }: { lang: Lang; list: Employer[]; total: number; state?: string }) {
  const es = lang === 'es', p = P[lang];
  const states = ['TX', 'FL', 'CA', 'GA', 'NC'];
  return (
    <Shell lang={lang} alt={P[other(lang)].employers}>
      <section className="hero slim"><div className="wrap">
        <h1>{es ? 'Empleadores que patrocinan trabajadores' : 'Employers that sponsor workers'}</h1>
        <p className="lead">{es ? 'Quién trajo trabajadores con visas H-2A y H-2B, dónde y cuántos, con datos públicos del Departamento de Trabajo.' : 'Who brought workers on H-2A and H-2B visas, where and how many, from public Department of Labor data.'}</p>
      </div></section>
      <main className="wrap main-pull">
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="tabs">{states.map((s) => <Link key={s} href={`${p.employers}?estado=${s}`} className="copy" style={{ height: 38, display: 'inline-flex', alignItems: 'center', background: state === s ? 'var(--blue)' : undefined, color: state === s ? '#fff' : undefined }}>{s}</Link>)}</div>
          {list.length === 0
            ? <p className="muted" style={{ margin: 0 }}>{es ? 'Estamos cargando los datos del Departamento de Trabajo para Texas, Florida, California, Georgia y Carolina del Norte. Muy pronto aquí.' : 'We are loading Department of Labor data for Texas, Florida, California, Georgia and North Carolina. Coming here very soon.'}</p>
            : <><p className="muted" style={{ margin: 0 }}>{total.toLocaleString(lang)} {es ? 'empleadores' : 'employers'}</p>
              <div className="list">{list.map((x) => <Link key={x.slug} href={employerPath(lang, x.slug)}><span className="fcode">{x.state}</span><span>{x.name}<small>{[x.city, x.county].filter(Boolean).join(' · ')}</small></span></Link>)}</div></>}
        </div>
        <section className="sec"><div className="card navy ctaBox">
          <div style={{ flex: '1 1 260px' }}><b style={{ fontSize: 20 }}>{es ? '¿Patrocinas trabajadores?' : 'Do you sponsor workers?'}</b><br /><span style={{ color: '#D6E0F2' }}>{es ? 'Sigue todas sus peticiones en un tablero, con avisos al equipo.' : 'Track every petition on one board, with team alerts.'}</span></div>
          <Link className="btn red" href={p.dashboard}>{es ? 'Ver el tablero' : 'See the dashboard'}</Link></div></section>
      </main>
    </Shell>
  );
}
