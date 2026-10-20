import Link from 'next/link';
import type { Lang } from '@/lib/types';
import { P, SUPABASE_KEY, SUPABASE_URL, T, fdate, fmonth, other } from '@/lib/i18n';
import { Shell, crumbs } from './Shell';
import BulletinCheck from './BulletinCheck';

type Row = { bulletin_month: string; chart: string; category: string; chargeability: string; cutoff_date: string | null; status: string; source_url: string | null };

export const CATS = ['F1', 'F2A', 'F2B', 'F3', 'F4', 'EB1', 'EB2', 'EB3', 'EB3_OW', 'EB4', 'EB5'];
export const COUNTRIES = ['ALL', 'MX', 'IN', 'CN', 'PH'];
const CAT_LABEL: Record<Lang, Record<string, string>> = {
  es: { F1: 'F1 · Hijos solteros de ciudadanos (21+)', F2A: 'F2A · Esposos e hijos menores de residentes', F2B: 'F2B · Hijos solteros de residentes (21+)', F3: 'F3 · Hijos casados de ciudadanos', F4: 'F4 · Hermanos de ciudadanos', EB1: 'EB1 · Trabajadores prioritarios', EB2: 'EB2 · Posgrado o habilidad excepcional', EB3: 'EB3 · Profesionales y calificados', EB3_OW: 'EB3 · Otros trabajadores', EB4: 'EB4 · Inmigrantes especiales', EB5: 'EB5 · Inversionistas (sin reservar)' },
  en: { F1: 'F1 · Unmarried sons/daughters of citizens (21+)', F2A: 'F2A · Spouses and minor children of residents', F2B: 'F2B · Unmarried sons/daughters of residents (21+)', F3: 'F3 · Married sons/daughters of citizens', F4: 'F4 · Siblings of citizens', EB1: 'EB1 · Priority workers', EB2: 'EB2 · Advanced degree or exceptional ability', EB3: 'EB3 · Professionals and skilled workers', EB3_OW: 'EB3 · Other workers', EB4: 'EB4 · Special immigrants', EB5: 'EB5 · Investors (unreserved)' },
};
const COUNTRY_LABEL: Record<Lang, Record<string, string>> = {
  es: { ALL: 'Resto del mundo', MX: 'México', IN: 'India', CN: 'China', PH: 'Filipinas' },
  en: { ALL: 'Rest of world', MX: 'Mexico', IN: 'India', CN: 'China', PH: 'Philippines' },
};

async function load(): Promise<Row[]> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/visa_bulletin?select=bulletin_month,chart,category,chargeability,cutoff_date,status,source_url&order=bulletin_month.desc&limit=600`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Accept-Profile': 'casealerta' },
      next: { revalidate: 3600 },
    });
    if (!r.ok) return [];
    return (await r.json()) as Row[];
  } catch { return []; }
}

export async function Bulletin({ lang }: { lang: Lang }) {
  const es = lang === 'es', t = T[lang], p = P[lang];
  const rows = await load();
  const months = Array.from(new Set(rows.map((r) => r.bulletin_month))).sort().reverse();
  const cur = months[0];
  const prev = months[1];
  const chart = rows.some((r) => r.bulletin_month === cur && r.chart === 'dates_for_filing') ? 'dates_for_filing' : 'final_action';
  const cell = (m: string | undefined, c: string, k: string) => rows.find((r) => r.bulletin_month === m && r.chart === chart && r.category === c && r.chargeability === k);
  const show = (r?: Row) => !r ? '—' : r.status === 'current' ? (es ? 'Al día (C)' : 'Current (C)') : r.status === 'unavailable' ? (es ? 'No disponible' : 'Unavailable') : r.cutoff_date ? fdate(lang, r.cutoff_date) : '—';
  const moved = (c: string, k: string) => {
    const a = cell(cur, c, k), b = cell(prev, c, k);
    if (!a || !b || !a.cutoff_date || !b.cutoff_date) return null;
    const d = Math.round((+new Date(a.cutoff_date) - +new Date(b.cutoff_date)) / 864e5);
    return d === 0 ? null : d;
  };
  const path = p.bulletin;
  const faqs = es ? [
    { q: '¿Qué es el boletín de visas?', a: 'Es la lista mensual del Departamento de Estado que dice qué fechas de prioridad ya pueden avanzar en cada categoría familiar o de empleo, por país. Si tu fecha de prioridad es anterior a la fecha publicada, tu caso puede seguir.' },
    { q: '¿Dónde veo mi fecha de prioridad?', a: 'En tu aviso de recibo o aprobación del I-130 o I-140 (formulario I-797), en el campo "Priority Date".' },
    { q: '¿Qué significa "Al día" (C)?', a: 'Que no hay fila en esa categoría y país: cualquier fecha de prioridad puede avanzar este mes.' },
    { q: '¿Cada cuándo cambia?', a: 'Una vez al mes, normalmente a mediados del mes anterior. Esta página se actualiza sola cuando sale el nuevo boletín.' },
  ] : [
    { q: 'What is the visa bulletin?', a: 'It is the State Department’s monthly list showing which priority dates can move forward in each family or employment category, by country. If your priority date is earlier than the published date, your case can move.' },
    { q: 'Where do I find my priority date?', a: 'On your I-130 or I-140 receipt or approval notice (Form I-797), in the "Priority Date" field.' },
    { q: 'What does "Current" (C) mean?', a: 'There is no line in that category and country: any priority date can move this month.' },
    { q: 'How often does it change?', a: 'Once a month, usually mid-month for the following month. This page updates itself when the new bulletin is out.' },
  ];
  const jsonld = { '@context': 'https://schema.org', '@graph': [crumbs([[t.home, p.home], [t.nav_bulletin, path]]),
    { '@type': 'FAQPage', inLanguage: lang, mainEntity: faqs.map((x) => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a } })) },
    { '@type': 'Dataset', name: es ? 'Boletín de visas — fechas por categoría y país' : 'Visa bulletin — dates by category and country', temporalCoverage: cur, isBasedOn: 'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html', creator: { '@type': 'Organization', name: 'CaseAlerta' } }] };
  return (
    <Shell lang={lang} alt={P[other(lang)].bulletin} jsonld={jsonld}>
      <section className="hero slim"><div className="wrap">
        <nav className="crumb"><Link href={p.home}>{t.home}</Link></nav>
        <h1>{es ? `Boletín de visas${cur ? ` de ${fmonth(lang, cur)}` : ''}, explicado` : `Visa bulletin${cur ? ` for ${fmonth(lang, cur)}` : ''}, explained`}</h1>
        <p className="lead">{es ? 'Fechas por categoría y país, en lenguaje claro. Revisa si tu fecha de prioridad ya puede avanzar.' : 'Dates by category and country, in plain language. Check if your priority date can move forward.'}</p>
      </div></section>
      <main className="wrap main-pull">
        <section className="card"><h2>{es ? '¿Ya me toca?' : 'Is it my turn?'}</h2>
          <BulletinCheck lang={lang} rows={rows.filter((r) => r.bulletin_month === cur && r.chart === chart)} cats={CATS.map((c) => [c, CAT_LABEL[lang][c]])} countries={COUNTRIES.map((c) => [c, COUNTRY_LABEL[lang][c]])} />
        </section>
        <section className="sec"><div className="card">
          <h2>{chart === 'dates_for_filing' ? (es ? 'Fechas para presentar (Dates for Filing)' : 'Dates for Filing') : (es ? 'Fechas de acción final' : 'Final Action Dates')}</h2>
          {rows.length === 0 ? <p className="muted">{es ? 'Estamos cargando el boletín de este mes. Vuelve en unas horas.' : 'We are loading this month’s bulletin. Check back in a few hours.'}</p> : (
            <div className="scroll"><table className="tbl">
              <thead><tr><th>{es ? 'Categoría' : 'Category'}</th>{COUNTRIES.map((k) => <th key={k}>{COUNTRY_LABEL[lang][k]}</th>)}</tr></thead>
              <tbody>{CATS.map((c) => <tr key={c}><td><b>{CAT_LABEL[lang][c]}</b></td>{COUNTRIES.map((k) => { const r = cell(cur, c, k); const m = moved(c, k); return <td key={k} className={r?.status === 'current' ? 'cur' : ''}>{show(r)}{m != null && <small style={{ display: 'block', color: m > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{m > 0 ? '▲' : '▼'} {Math.abs(m)} {es ? 'días' : 'days'}</small>}</td>; })}</tr>)}</tbody>
            </table></div>
          )}
          <p className="muted small">{es ? 'Fuente: Departamento de Estado de EE.UU. (travel.state.gov). USCIS indica cada mes qué tabla usar para el I-485; revisa uscis.gov/visabulletininfo. No es asesoría legal.' : 'Source: U.S. Department of State (travel.state.gov). USCIS says each month which chart to use for the I-485; see uscis.gov/visabulletininfo. Not legal advice.'}</p>
        </div></section>
        <section className="sec"><div className="card"><h2>{es ? 'Preguntas frecuentes' : 'Frequently asked questions'}</h2>
          <div className="faq">{faqs.map((x) => <details key={x.q}><summary>{x.q}</summary><p>{x.a}</p></details>)}</div></div></section>
        <section className="sec"><div className="card navy ctaBox">
          <div style={{ flex: '1 1 260px' }}><b style={{ fontSize: 20 }}>{es ? 'Te aviso cuando tu fecha sea actual' : 'I will alert you when your date is current'}</b><br /><span style={{ color: '#D6E0F2' }}>{es ? 'En la app capturas tu fecha de prioridad y te avisamos el mes que avance.' : 'In the app you enter your priority date and we alert you the month it moves.'}</span></div>
          <Link className="btn red" href={`${p.home}#consulta`}>{t.cta}</Link></div></section>
      </main>
    </Shell>
  );
}
