import type { MetadataRoute } from 'next';
import { FORMS, NEWS, STATUSES, applies, formPath, newsPath, statusPath, w1Path } from '@/lib/catalog';
import { P, SITE } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

export const dynamic = 'force-static';
const L: Lang[] = ['es', 'en'];
const now = new Date('2026-10-20');

export default function sitemap(): MetadataRoute.Sitemap {
  const u = (path: string, priority = 0.6, lastModified: Date = now) => ({ url: `${SITE}${path}`, lastModified, priority });
  const out: MetadataRoute.Sitemap = [];
  for (const l of L) {
    const p = P[l];
    out.push(u(p.home, 1), u(p.status, 0.9), u(p.forms, 0.9), u(p.bulletin, 0.9), u(p.news, 0.7), u(p.privacy, 0.2), u(p.terms, 0.2));
    for (const s of STATUSES) out.push(u(statusPath(l, s), 0.8));
    for (const f of FORMS) {
      out.push(u(formPath(l, f), 0.8));
      for (const s of STATUSES) if (applies(f, s)) out.push(u(w1Path(l, f, s), f.popularity <= 15 ? 0.7 : 0.5));
    }
    for (const a of NEWS) out.push(u(newsPath(l, a), 0.6, new Date(a.updated ?? a.date)));
  }
  return out;
}
