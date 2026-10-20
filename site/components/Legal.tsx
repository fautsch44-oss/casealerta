import type { Lang } from '@/lib/types';
import legal from '@/lib/legal.json';
import { Shell } from './Shell';

type Doc = { lang: string; title: string; other: string; secs: { h: string; p: string }[] };
const L = legal as Record<string, Doc>;

export const legalTitle = (key: string) => L[key].title;

export function Legal({ k }: { k: 'privacidad' | 'privacy' | 'terminos' | 'terms' }) {
  const d = L[k];
  const lang = d.lang as Lang;
  return (
    <Shell lang={lang} alt={`/${d.other}/`}>
      <main className="wrap"><article className="legal card" style={{ marginTop: 28 }}>
        <h1 style={{ marginTop: 0 }}>{d.title}</h1>
        <p className="muted">{lang === 'es' ? 'Última actualización: 20 de octubre de 2026' : 'Last updated: October 20, 2026'}</p>
        {d.secs.map((s) => <section key={s.h}><h2>{s.h}</h2><p>{s.p}</p></section>)}
      </article></main>
    </Shell>
  );
}
