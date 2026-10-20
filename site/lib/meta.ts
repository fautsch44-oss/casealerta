import type { Metadata } from 'next';
import type { Lang } from './types';
import { SITE } from './i18n';

export function meta(lang: Lang, title: string, description: string, path: string, altPath?: string, type: 'website' | 'article' = 'website'): Metadata {
  const es = lang === 'es' ? path : altPath;
  const en = lang === 'en' ? path : altPath;
  return {
    title, description,
    metadataBase: new URL(SITE),
    alternates: {
      canonical: path,
      languages: altPath ? { es: es!, en: en!, 'x-default': es! } : undefined,
    },
    openGraph: { type, siteName: 'CaseAlerta', locale: lang === 'es' ? 'es_US' : 'en_US', title, description, url: path, images: ['/sello.png'] },
    twitter: { card: 'summary', title, description },
    icons: { icon: '/sello.png' },
    other: { 'theme-color': '#1F4FA0' },
  };
}
