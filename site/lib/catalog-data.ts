import 'server-only';
// Lectura de los datos del catálogo desde disco (Vercel / Next).
// El Worker de Cloudflare reemplaza este módulo por un paquete generado (worker/scripts/gen-data.mjs).
import fs from 'node:fs';
import path from 'node:path';
import type { Form, NewsItem, Note, Status } from './types';

const DATA = path.join(process.cwd(), 'data');
const readJson = <T,>(p: string, fallback: T): T => {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T; } catch { return fallback; }
};

export const FORMS_RAW: Form[] = readJson<Form[]>(path.join(DATA, 'forms.json'), []);
export const STATUSES_RAW: Status[] = readJson<Status[]>(path.join(DATA, 'statuses.json'), []);

export const NOTES_RAW: Record<string, Record<string, Note>> = {};
try {
  for (const f of fs.readdirSync(path.join(DATA, 'notes'))) {
    if (f.endsWith('.json')) NOTES_RAW[f.replace(/\.json$/, '')] = readJson(path.join(DATA, 'notes', f), {});
  }
} catch { /* sin notas aún */ }

/** Noticias: la fuente de verdad sigue siendo web/src/news/*.json (otras sesiones publican ahí). */
function loadNews(): NewsItem[] {
  const dirs = [path.join(process.cwd(), '..', 'web', 'src', 'news'), path.join(process.cwd(), 'content', 'news')];
  for (const d of dirs) {
    try {
      const items = fs.readdirSync(d).filter((f) => f.endsWith('.json')).map((f) => readJson<NewsItem>(path.join(d, f), null as unknown as NewsItem)).filter(Boolean);
      if (items.length) return items;
    } catch { /* siguiente */ }
  }
  return [];
}
export const NEWS_RAW: NewsItem[] = loadNews();
