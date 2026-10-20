import Link from 'next/link';
import type { Lang } from '@/lib/types';
import { P, T, other } from '@/lib/i18n';
import { Globe, Search } from './Icons';

const Briefcase = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5h6v2" /></svg>;
const Phone = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></svg>;

export function Lockup({ lang }: { lang: Lang }) {
  return (
    <Link className="brand" href={P[lang].home} aria-label="CaseAlerta">
      <span className="medal"><img src="/sello.png" alt="" width={48} height={48} /></span>
      <span className="lock">
        <span className="word">CASEALERTA</span><span className="rib" />
        <span className="tag">{T[lang].tagline.split(' ').map((w, i) => <span key={i}>{w}</span>)}</span>
      </span>
    </Link>
  );
}

export function Shell({ lang, alt, children, jsonld }: { lang: Lang; alt?: string; children: React.ReactNode; jsonld?: object }) {
  const t = T[lang], p = P[lang], o = other(lang);
  return (
    <>
      <a className="skip" href="#contenido">{lang === 'es' ? 'Saltar al contenido' : 'Skip to content'}</a>
      <header className="hdr"><div className="wrap">
        <Lockup lang={lang} />
        <nav className="nav" aria-label={lang === 'es' ? 'Principal' : 'Main'}>
          <Link className="hide-sm" href={p.status}>{t.nav_status}</Link>
          <Link className="hide-sm" href={p.employers}><Briefcase />{lang === 'es' ? 'Empleadores' : 'Employers'}</Link>
          <Link className="hide-sm" href={p.bulletin}>{t.nav_bulletin}</Link>
          <a href={alt ?? P[o].home} hrefLang={o}><Globe />{o.toUpperCase()}</a>
          <Link className="hide-sm app" href={`${p.home}#app`}><Phone />{lang === 'es' ? 'Bajar la app' : 'Get the app'}</Link>
          <Link className="cta" href={`${p.home}#consulta`}><Search />{t.check}</Link>
        </nav>
      </div></header>
      <div id="contenido">{children}</div>
      <footer className="ftr"><div className="wrap">
        CaseAlerta · VARGER Group LLC · Conroe, Texas · {t.footer}<br />
        <Link href={p.privacy}>{t.privacy}</Link>·<Link href={p.terms}>{t.terms}</Link>·<Link href={p.status}>{t.nav_status}</Link>·<Link href={p.forms}>{t.nav_forms}</Link>·<Link href={p.employers}>{lang === 'es' ? 'Empleadores' : 'Employers'}</Link>·<Link href={p.bulletin}>{t.nav_bulletin}</Link>·<Link href={p.news}>{t.nav_news}</Link>·<a href={`${p.news}rss.xml`}>RSS</a>·<a href="/llms.txt">llms.txt</a>
      </div></footer>
      {jsonld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld).replace(/</g, '\\u003c') }} />}
    </>
  );
}

export function RootDoc({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700;800&family=Cinzel:wght@700&display=swap" />
        <link rel="alternate" type="application/rss+xml" title="CaseAlerta" href={`${P[lang].news}rss.xml`} />
      </head>
      <body>{children}</body>
    </html>
  );
}

export const crumbs = (items: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: `https://casealerta.com${url}` })),
});
