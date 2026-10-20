import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Lang } from './types';
import { FORMS, NEWS, STATUSES, applies, fName, formBySlug, formPath, newsPath, note, pick, rangeText, sTitle, statusBySlug, statusPath, w1Path } from './catalog';
import { P, other } from './i18n';
import { meta } from './meta';
import { FormPage, FormsIndex, Home, StatusIndex, StatusPage } from '@/components/Pages';
import { NewsArticle, NewsIndex } from '@/components/News';
import { Bulletin } from '@/components/Bulletin';
import { Legal } from '@/components/Legal';

const sSlug = (lang: Lang) => (lang === 'es' ? 'slug_es' : 'slug_en') as 'slug_es' | 'slug_en';

export function statusParams(lang: Lang) {
  const out: { slug: string[] }[] = STATUSES.map((s) => ({ slug: [s[sSlug(lang)]] }));
  for (const f of FORMS.filter((x) => x.popularity <= 12)) for (const s of STATUSES) if (applies(f, s)) out.push({ slug: [f.slug, s[sSlug(lang)]] });
  return out;
}

function resolve(lang: Lang, slug: string[]) {
  if (slug.length === 1) { const st = statusBySlug(lang, slug[0]); return st ? { st, form: undefined } : null; }
  if (slug.length === 2) {
    const form = formBySlug(slug[0]); const st = statusBySlug(lang, slug[1]);
    if (form && st && applies(form, st)) return { st, form };
  }
  return null;
}

export function statusMeta(lang: Lang, slug: string[]): Metadata {
  const r = resolve(lang, slug);
  if (!r) return {};
  const { st, form } = r;
  const o = other(lang);
  if (form) {
    const desc = (note(form, st, lang) ?? pick(lang, st.meaning_es, st.meaning_en)).slice(0, 158);
    const title = lang === 'es'
      ? `"${st.code}" en tu ${form.code}: qué significa y qué sigue · CaseAlerta`
      : `"${st.code}" on your ${form.code}: what it means and what's next · CaseAlerta`;
    return meta(lang, title, desc, w1Path(lang, form, st), w1Path(o, form, st));
  }
  const title = lang === 'es' ? `"${st.code}" — qué significa en USCIS (${st.title_es}) · CaseAlerta` : `"${st.code}" — what it means on USCIS · CaseAlerta`;
  return meta(lang, title, pick(lang, st.meaning_es, st.meaning_en).slice(0, 158), statusPath(lang, st), statusPath(o, st));
}

export function StatusRoute({ lang, slug }: { lang: Lang; slug: string[] }) {
  const r = resolve(lang, slug);
  if (!r) notFound();
  return <StatusPage lang={lang} st={r.st} form={r.form} />;
}

export const formParams = () => FORMS.map((f) => ({ form: f.slug }));
export function formMeta(lang: Lang, slug: string): Metadata {
  const f = formBySlug(slug);
  if (!f) return {};
  const r = rangeText(lang, f);
  const title = lang === 'es' ? `Formulario ${f.code}: estatus explicados${r ? ` y tiempo típico (${r})` : ''} · CaseAlerta` : `Form ${f.code}: case statuses explained${r ? ` and typical time (${r})` : ''} · CaseAlerta`;
  return meta(lang, title, `${fName(lang, f)}. ${pick(lang, f.what_es, f.what_en)}`.slice(0, 158), formPath(lang, f), formPath(other(lang), f));
}
export function FormRoute({ lang, slug }: { lang: Lang; slug: string }) {
  const f = formBySlug(slug);
  if (!f) notFound();
  return <FormPage lang={lang} form={f} />;
}

export const newsParams = (lang: Lang) => NEWS.map((a) => ({ slug: lang === 'es' ? a.slug_es : a.slug_en }));
const newsFind = (lang: Lang, slug: string) => NEWS.find((a) => (lang === 'es' ? a.slug_es : a.slug_en) === slug);
export function newsMeta(lang: Lang, slug: string): Metadata {
  const a = newsFind(lang, slug);
  if (!a) return {};
  return meta(lang, `${lang === 'es' ? a.title_es : a.title_en} · CaseAlerta`, lang === 'es' ? a.desc_es : a.desc_en, newsPath(lang, a), newsPath(other(lang), a), 'article');
}
export function NewsRoute({ lang, slug }: { lang: Lang; slug: string }) {
  const a = newsFind(lang, slug);
  if (!a) notFound();
  return <NewsArticle lang={lang} a={a} />;
}

export const homeMeta = (lang: Lang) => meta(lang,
  lang === 'es' ? 'CaseAlerta — Consulta y alertas de tu caso USCIS, explicado en español' : 'CaseAlerta — USCIS case status alerts, explained',
  lang === 'es' ? 'Consulta gratis el estatus de tu caso USCIS, entiende qué significa para tu formulario y recibe avisos cuando cambie. Sin anuncios.' : 'Check your USCIS case status for free, understand what it means for your form and get alerts when it changes. No ads.',
  P[lang].home, P[other(lang)].home);
export const statusIndexMeta = (lang: Lang) => meta(lang, lang === 'es' ? 'Estatus de USCIS explicados · CaseAlerta' : 'USCIS case statuses explained · CaseAlerta',
  lang === 'es' ? `Los ${STATUSES.length} estatus de casos USCIS explicados en español: qué significan, qué hacer y cuánto tardan.` : `All ${STATUSES.length} common USCIS case statuses explained: what they mean, what to do and how long they take.`, P[lang].status, P[other(lang)].status);
export const formsIndexMeta = (lang: Lang) => meta(lang, lang === 'es' ? 'Formularios de USCIS explicados · CaseAlerta' : 'USCIS forms explained · CaseAlerta',
  lang === 'es' ? `${FORMS.length} formularios de USCIS con sus estatus explicados y tiempos típicos.` : `${FORMS.length} USCIS forms with every status explained and typical processing times.`, P[lang].forms, P[other(lang)].forms);
export const newsIndexMeta = (lang: Lang) => meta(lang, lang === 'es' ? 'Noticias y guías de USCIS · CaseAlerta' : 'USCIS news and guides · CaseAlerta',
  lang === 'es' ? 'Noticias de USCIS y guías de inmigración en español, con fuentes oficiales.' : 'USCIS news and immigration guides in plain English, with official sources.', P[lang].news, P[other(lang)].news);
export const bulletinMeta = (lang: Lang) => meta(lang, lang === 'es' ? 'Boletín de visas explicado: fechas de este mes por categoría y país · CaseAlerta' : 'Visa bulletin explained: this month’s dates by category and country · CaseAlerta',
  lang === 'es' ? 'El boletín de visas del Departamento de Estado explicado en español: fechas de presentación por categoría familiar y de empleo, México, India, China y Filipinas.' : 'The State Department visa bulletin explained: dates for filing by family and employment category, for Mexico, India, China and the Philippines.',
  P[lang].bulletin, P[other(lang)].bulletin);

export { Home, StatusIndex, FormsIndex, NewsIndex, Bulletin, Legal, sTitle };
