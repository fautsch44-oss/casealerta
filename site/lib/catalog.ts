import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import type { Form, Lang, NewsItem, Note, Status } from './types';
import { P, STAGES } from './i18n';

const DATA = path.join(process.cwd(), 'data');
const readJson = <T,>(p: string, fallback: T): T => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T; } catch { return fallback; }
};

export const FORMS: Form[] = readJson<Form[]>(path.join(DATA, 'forms.json'), []).sort((a, b) => a.popularity - b.popularity);
export const STATUSES: Status[] = readJson<Status[]>(path.join(DATA, 'statuses.json'), []);

const NOTES: Record<string, Record<string, Note>> = {};
try {
  for (const f of fs.readdirSync(path.join(DATA, 'notes'))) {
    if (f.endsWith('.json')) NOTES[f.replace(/\.json$/, '')] = readJson(path.join(DATA, 'notes', f), {});
  }
} catch { /* sin notas aún */ }

export function note(form: Form, st: Status, lang: Lang): string | null {
  return NOTES[form.slug]?.[st.slug_en]?.[lang] ?? null;
}

export const formBySlug = (s: string) => FORMS.find((f) => f.slug === s);
export const statusBySlug = (lang: Lang, s: string) => STATUSES.find((x) => (lang === 'es' ? x.slug_es : x.slug_en) === s);
export const statusByCode = (code: string) => {
  const c = code.trim().toLowerCase();
  return STATUSES.find((x) => x.code.toLowerCase() === c);
};
export const formByCode = (code: string | null | undefined) => {
  if (!code) return undefined;
  const c = code.toUpperCase().replace(/\s+/g, '');
  return FORMS.find((f) => f.code.toUpperCase() === c);
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

/** Noticias: la fuente de verdad sigue siendo web/src/news/*.json (otras sesiones publican ahí). */
function loadNews(): NewsItem[] {
  const dirs = [path.join(process.cwd(), '..', 'web', 'src', 'news'), path.join(process.cwd(), 'content', 'news')];
  for (const d of dirs) {
    try {
      const items = fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => readJson<NewsItem>(path.join(d, f), null as unknown as NewsItem)).filter(Boolean);
      if (items.length) return items.sort((a, b) => (a.date === b.date ? (a.type === 'news' ? -1 : 1) : a.date < b.date ? 1 : -1));
    } catch { /* siguiente */ }
  }
  return [];
}
export const NEWS = loadNews();
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
