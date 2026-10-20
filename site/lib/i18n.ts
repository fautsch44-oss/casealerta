import type { Kind, Lang } from './types';

export const SITE = 'https://casealerta.com';
export const SUPABASE_URL = 'https://uloquxlrghnvbrinfacw.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_jdwXHvpr4jml-zhYcQhFNw_2ISCIyhc';
export const VAPID_PUBLIC = 'BGrzrin6ZyB-9yT-7CdWkQn8c5pFLgkNP14UMbAGiZPUZ1oLulaISRNIGepH9XCfPhLYp9ZNnDkGdERdoV-hdfM';
export const INDEXNOW_KEY = 'c4a5e1a7f0b84d2c9e3a6b1d8f2e7c41';

export const P = {
  es: {
    home: '/', status: '/estatus/', forms: '/formularios/', form: '/formulario/', news: '/noticias/',
    bulletin: '/boletin-de-visas/', privacy: '/privacidad/', terms: '/terminos/', employers: '/empleadores/', employer: '/empleador/',
  },
  en: {
    home: '/en/', status: '/status/', forms: '/forms/', form: '/form/', news: '/en/news/',
    bulletin: '/en/visa-bulletin/', privacy: '/privacy/', terms: '/terms/', employers: '/en/employers/', employer: '/en/employer/',
  },
} as const;

export const other = (l: Lang): Lang => (l === 'es' ? 'en' : 'es');

export const KIND_COLOR: Record<Kind, { fg: string; bg: string }> = {
  ok: { fg: '#9A6400', bg: '#FFF4DB' },
  act: { fg: '#C8102E', bg: '#FCE8EB' },
  good: { fg: '#1E7A46', bg: '#E3F5EA' },
  bad: { fg: '#7A1E2B', bg: '#F6E1E4' },
};

export const KIND_LABEL: Record<Lang, Record<Kind, string>> = {
  es: { ok: 'Sigue en proceso', act: 'Requiere tu atención', good: 'Buenas noticias', bad: 'Decisión desfavorable' },
  en: { ok: 'Still in process', act: 'Needs your attention', good: 'Good news', bad: 'Unfavorable decision' },
};

export const STAGES = ['intake', 'biometrics', 'review', 'evidence', 'interview', 'decision', 'card', 'closed', 'admin'] as const;
export const STAGE_LABEL: Record<Lang, Record<string, string>> = {
  es: { intake: 'Recepción', biometrics: 'Huellas (biometría)', review: 'Revisión', evidence: 'Evidencia (RFE/NOID)', interview: 'Entrevista y juramento', decision: 'Decisión', card: 'Tarjeta y documentos', closed: 'Caso cerrado', admin: 'Trámites administrativos' },
  en: { intake: 'Intake', biometrics: 'Biometrics', review: 'Review', evidence: 'Evidence (RFE/NOID)', interview: 'Interview and oath', decision: 'Decision', card: 'Card and documents', closed: 'Closed case', admin: 'Administrative' },
};

export const GROUP_LABEL: Record<Lang, Record<string, string>> = {
  es: { family: 'Familia', employment: 'Empleo', humanitarian: 'Humanitario', naturalization: 'Ciudadanía', travel_work: 'Permisos de trabajo y viaje', card: 'Tarjetas', investor: 'Inversionistas', waiver_appeal: 'Perdones y apelaciones', other: 'Otros' },
  en: { family: 'Family', employment: 'Employment', humanitarian: 'Humanitarian', naturalization: 'Citizenship', travel_work: 'Work and travel permits', card: 'Cards', investor: 'Investors', waiver_appeal: 'Waivers and appeals', other: 'Other' },
};

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export function fdate(lang: Lang, iso: string) {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return lang === 'es' ? `${d} de ${MONTHS_ES[m - 1]} de ${y}` : `${MONTHS_EN[m - 1]} ${d}, ${y}`;
}
export function fmonth(lang: Lang, iso: string) {
  const [y, m] = iso.slice(0, 10).split('-').map(Number);
  return lang === 'es' ? `${MONTHS_ES[m - 1]} de ${y}` : `${MONTHS_EN[m - 1]} ${y}`;
}

export function slugify(s: string) {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const T = {
  es: {
    tagline: 'ALERTAS DE TU CASO USCIS Y CORTE',
    nav_status: 'Estatus explicados', nav_forms: 'Formularios', nav_news: 'Noticias y guías', nav_bulletin: 'Boletín de visas',
    check: 'Consultar', home: 'Inicio', cta: 'Avísame cuando cambie',
    footer: 'No somos USCIS ni un despacho de abogados. Explicaciones con IA, no es asesoría legal.',
    privacy: 'Privacidad', terms: 'Términos', ai_note: 'Explicación preparada con IA a partir del estatus oficial de USCIS y revisada por CaseAlerta. No es asesoría legal. Los tiempos son rangos típicos, nunca una fecha exacta.',
  },
  en: {
    tagline: 'USCIS & COURT CASE ALERTS',
    nav_status: 'Status explained', nav_forms: 'Forms', nav_news: 'News & guides', nav_bulletin: 'Visa bulletin',
    check: 'Check', home: 'Home', cta: 'Alert me when it changes',
    footer: 'We are not USCIS or a law firm. AI-assisted explanations, not legal advice.',
    privacy: 'Privacy', terms: 'Terms', ai_note: 'AI-assisted explanation based on the official USCIS status, reviewed by CaseAlerta. Not legal advice. Times are typical ranges, never an exact date.',
  },
} as const;
