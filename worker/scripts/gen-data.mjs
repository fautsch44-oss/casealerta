// Empaqueta los datos del catálogo (los mismos que lee la web) para el Worker: build/catalog-data.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const data = path.join(root, 'site', 'data');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const dir = (d) => (fs.existsSync(d) ? fs.readdirSync(d).filter((f) => f.endsWith('.json')).sort() : []);

const forms = read(path.join(data, 'forms.json'));
const statuses = read(path.join(data, 'statuses.json'));
const notes = Object.fromEntries(dir(path.join(data, 'notes')).map((f) => [f.replace(/\.json$/, ''), read(path.join(data, 'notes', f))]));
const newsDir = path.join(root, 'web', 'src', 'news');
const news = dir(newsDir).map((f) => read(path.join(newsDir, f)));

const out = `// Generado por scripts/gen-data.mjs — no editar a mano.
import type { Form, NewsItem, Note, Status } from '@/lib/types';
export const FORMS_RAW: Form[] = ${JSON.stringify(forms)};
export const STATUSES_RAW: Status[] = ${JSON.stringify(statuses)};
export const NOTES_RAW: Record<string, Record<string, Note>> = ${JSON.stringify(notes)};
export const NEWS_RAW: NewsItem[] = ${JSON.stringify(news)};
`;
fs.mkdirSync(path.join(root, 'worker', 'build'), { recursive: true });
fs.writeFileSync(path.join(root, 'worker', 'build', 'catalog-data.ts'), out);
console.log(`catalog-data.ts: ${forms.length} formularios, ${statuses.length} estatus, ${Object.keys(notes).length} notas, ${news.length} noticias, ${(out.length / 1024).toFixed(0)} KB`);
