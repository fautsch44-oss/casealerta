// Catálogo de formularios, estatus y noticias: lógica pura (corre en Vercel y en el Worker de Cloudflare).
import type { Form, Lang, NewsItem, Status } from './types';
import { P, STAGES } from './i18n';
import { FORMS_RAW, NEWS_RAW, NOTES_RAW, STATUSES_RAW } from '@/lib/catalog-data';

export const FORMS: Form[] = [...FORMS_RAW].sort((a, b) => a.popularity - b.popularity);
export const STATUSES: Status[] = STATUSES_RAW;
const NOTES = NOTES_RAW;

export function note(form: Form, st: Status, lang: Lang): string | null {
  return NOTES[form.slug]?.[st.slug_en]?.[lang] ?? null;
}

export const formBySlug = (s: string) => FORMS.find((f) => f.slug === s);
export const statusBySlug = (lang: Lang, s: string) => STATUSES.find((x) => (lang === 'es' ? x.slug_es : x.slug_en) === s);
export const statusByCode = (code: string) => {
  const k = (x: string) => x.trim().toLowerCase().replace(/[.\s]+$/, '').replace(/\s+/g, ' ');
  const c = k(code);
  return STATUSES.find((x) => k(x.code) === c) ?? STATUSES.find((x) => k(x.title_es) === c); // también acepta el título en español
};
export const formByCode = (code: string | null | undefined) => {
  if (!code) return undefined;
  const c = code.toUpperCase().replace(/\s+/g, '');
  const key = (x: string) => x.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return FORMS.find((f) => f.code.toUpperCase() === c) ?? FORMS.find((f) => key(f.code) === key(c)); // "n400", "I 485", "i485"

};

export function applies(form: Form, st: Status) {
  if (st.card_only && !form.has_card) return false;
  if (st.interview_only && form.has_interview === 'rarely') return false;
  return st.applies_to.includes('all') || st.applies_to.includes(form.group);
}

const stageIdx = (s: string) => { const i = (STAGES as readonly string[]).indexOf(s); return i < 0 ? 99 : i; };
export const byStage = (a: Status, b: Status) => stageIdx(a.stage) - stageIdx(b.stage);

export const statusesFor = (form: Form) => STATUSES.filter((s) => applies(form, s)).sort(byStage);
export const formsFor = (st: Status) => FORMS.filter((f) => applies(f, st));

export const statusPath = (lang: Lang, st: Status) => `${P[lang].status}${lang === 'es' ? st.slug_es : st.slug_en}/`;
export const w1Path = (lang: Lang, form: Form, st: Status) => `${P[lang].status}${form.slug}/${lang === 'es' ? st.slug_es : st.slug_en}/`;
export const formPath = (lang: Lang, form: Form) => `${P[lang].form}${form.slug}/`;

export const sTitle = (lang: Lang, st: Status) => (lang === 'es' ? st.title_es : st.code);
export const fName = (lang: Lang, f: Form) => (lang === 'es' ? f.name_es : f.name_en);
export const fShort = (lang: Lang, f: Form) => (lang === 'es' ? f.short_es : f.short_en);
export const pick = <T,>(lang: Lang, es: T, en: T) => (lang === 'es' ? es : en);

export function rangeText(lang: Lang, f: Form) {
  if (f.typical_months_min == null || f.typical_months_max == null) return null;
  return lang === 'es'
    ? `${f.typical_months_min} a ${f.typical_months_max} meses`
    : `${f.typical_months_min} to ${f.typical_months_max} months`;
}

export const NEWS: NewsItem[] = [...NEWS_RAW].sort((a, b) => (a.date === b.date ? (a.type === 'news' ? -1 : 1) : a.date < b.date ? 1 : -1));
export const newsPath = (lang: Lang, a: NewsItem) => `${P[lang].news}${lang === 'es' ? a.slug_es : a.slug_en}/`;

/** Mapa compacto para el cliente (consulta en vivo). */
export function clientCatalog(lang: Lang) {
  return {
    statuses: STATUSES.map((s) => ({
      code: s.code, kind: s.kind, stage: s.stage, title: sTitle(lang, s),
      meaning: pick(lang, s.meaning_es, s.meaning_en), next: pick(lang, s.next_es, s.next_en), path: statusPath(lang, s), slug: lang === 'es' ? s.slug_es : s.slug_en,
    })),
    forms: FORMS.map((f) => ({
      code: f.code, slug: f.slug, name: fName(lang, f), short: fShort(lang, f), range: rangeText(lang, f),
      milestones: pick(lang, f.milestones_es, f.milestones_en), path: formPath(lang, f), statusBase: P[lang].status,
    })),
  };
}
export type ClientCatalog = ReturnType<typeof clientCatalog>;
