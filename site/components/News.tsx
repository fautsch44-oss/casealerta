import Link from 'next/link';
import type { Lang, NewsItem } from '@/lib/types';
import { P, T, fdate, other } from '@/lib/i18n';
import { NEWS, newsPath } from '@/lib/catalog';
import { Shell, crumbs } from './Shell';
import { Bell, Spark } from './Icons';

export function NewsCards({ lang, items }: { lang: Lang; items: NewsItem[] }) {
  const es = lang === 'es';
  return (
    <div className="news">{items.map((a) => {
      const isNews = a.type === 'news';
      const I = isNews ? Bell : Spark;
      return (
        <Link className="ncard" key={a.slug_en} href={newsPath(lang, a)}>
          <span className="ic" style={{ background: isNews ? '#FCE8EB' : '#FFF4DB', color: isNews ? '#C8102E' : '#9A6400', width: 44, height: 44, minWidth: 44 }}><I s={22} /></span>
          <span><small>{isNews ? (es ? 'Noticia' : 'News') : (es ? 'Guía' : 'Guide')} · {fdate(lang, a.date)}</small><b>{es ? a.title_es : a.title_en}</b><span>{es ? a.desc_es : a.desc_en}</span></span>
        </Link>
      );
    })}</div>
  );
}

function Md({ lines }: { lines: string[] }) {
  const out: React.ReactNode[] = [];
  let ul: string[] = [];
  const flush = (k: number) => { if (ul.length) { out.push(<ul key={`u${k}`}>{ul.map((x) => <li key={x}>{x}</li>)}</ul>); ul = []; } };
  lines.forEach((ln, i) => {
    if (ln.startsWith('- ')) { ul.push(ln.slice(2)); return; }
    flush(i);
    out.push(ln.startsWith('## ') ? <h2 key={i}>{ln.slice(3)}</h2> : <p key={i}>{ln}</p>);
  });
  flush(lines.length);
  return <>{out}</>;
}

export function NewsIndex({ lang }: { lang: Lang }) {
  const t = T[lang], p = P[lang], es = lang === 'es';
  const jsonld = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: t.nav_news, url: `https://casealerta.com${p.news}`, inLanguage: lang,
    hasPart: NEWS.map((a) => ({ '@type': a.type === 'news' ? 'NewsArticle' : 'Article', headline: es ? a.title_es : a.title_en, url: `https://casealerta.com${newsPath(lang, a)}`, datePublished: a.date })) };
  return (
    <Shell lang={lang} alt={P[other(lang)].news} jsonld={jsonld}>
      <section className="hero slim"><div className="wrap"><h1>{t.nav_news}</h1><p className="lead">{es ? 'Lo nuevo de USCIS y guías prácticas, explicado en lenguaje claro. Con fuentes oficiales.' : 'What is new at USCIS and practical guides, in plain language. With official sources.'}</p></div></section>
      <main className="wrap main-pull"><NewsCards lang={lang} items={NEWS} /></main>
    </Shell>
  );
}

export function NewsArticle({ lang, a }: { lang: Lang; a: NewsItem }) {
  const t = T[lang], p = P[lang], es = lang === 'es';
  const path = newsPath(lang, a);
  const title = es ? a.title_es : a.title_en, desc = es ? a.desc_es : a.desc_en;
  const lbl = a.type === 'news' ? (es ? 'Noticia' : 'News') : (es ? 'Guía' : 'Guide');
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': a.type === 'news' ? 'NewsArticle' : 'Article', headline: title, description: desc, datePublished: a.date, dateModified: a.updated ?? a.date, inLanguage: lang,
      mainEntityOfPage: `https://casealerta.com${path}`, image: 'https://casealerta.com/sello.png', author: { '@type': 'Organization', name: 'CaseAlerta', url: 'https://casealerta.com' },
      publisher: { '@type': 'Organization', name: 'VARGER Group LLC', logo: { '@type': 'ImageObject', url: 'https://casealerta.com/sello.png' } }, citation: a.sources.map((x) => x.u) },
    crumbs([[t.home, p.home], [t.nav_news, p.news], [title, path]]),
  ] };
  return (
    <Shell lang={lang} alt={newsPath(other(lang), a)} jsonld={jsonld}>
      <section className="hero slim"><div className="wrap">
        <nav className="crumb"><Link href={p.home}>{t.home}</Link> › <Link href={p.news}>{t.nav_news}</Link></nav>
        <span className="badge" style={{ background: '#fff', color: 'var(--navy)' }}>{lbl} · <time dateTime={a.date}>{fdate(lang, a.date)}</time></span>
        <h1 style={{ marginTop: 14 }}>{title}</h1><p className="lead">{desc}</p></div></section>
      <main className="wrap main-pull">
        <article className="card legal art"><Md lines={es ? a.body_es : a.body_en} />
          <h2>{es ? 'Fuentes' : 'Sources'}</h2><ul className="src">{a.sources.map((x) => <li key={x.u}><a href={x.u} rel="noopener" target="_blank">{x.t}</a></li>)}</ul>
          <p className="muted small">{es ? 'Resumen informativo preparado por CaseAlerta con apoyo de IA a partir de fuentes oficiales. No es asesoría legal.' : 'Informational summary prepared by CaseAlerta with AI assistance from official sources. Not legal advice.'}</p></article>
        <section className="sec"><div className="card navy ctaBox">
          <span className="ic" style={{ background: 'var(--gold)', color: 'var(--navy)' }}><Bell /></span>
          <div style={{ flex: '1 1 260px' }}><b style={{ fontSize: 20 }}>{es ? '¿Tienes un caso en trámite?' : 'Have a pending case?'}</b><br /><span style={{ color: '#D6E0F2' }}>{es ? 'Revísalo gratis y te avisamos cuando cambie.' : 'Check it for free and we will alert you when it changes.'}</span></div>
          <Link className="btn red" href={`${p.home}#consulta`}>{t.cta}</Link></div></section>
        <section className="sec"><h2>{es ? 'Más para leer' : 'Read more'}</h2><NewsCards lang={lang} items={NEWS.filter((x) => x !== a).slice(0, 3)} /></section>
      </main>
    </Shell>
  );
}

export function rss(lang: Lang) {
  const t = T[lang], p = P[lang], es = lang === 'es';
  const e = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
  const items = NEWS.slice(0, 30).map((a) => {
    const u = `https://casealerta.com${newsPath(lang, a)}`;
    return `<item><title>${e(es ? a.title_es : a.title_en)}</title><link>${u}</link><guid>${u}</guid><pubDate>${new Date(`${a.date}T12:00:00Z`).toUTCString()}</pubDate><description>${e(es ? a.desc_es : a.desc_en)}</description></item>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>CaseAlerta · ${e(t.nav_news)}</title><link>https://casealerta.com${p.news}</link><description>CaseAlerta</description><language>${es ? 'es-us' : 'en-us'}</language>${items}</channel></rss>`;
}
