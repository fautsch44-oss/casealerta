import type { Semaphore } from '../theme/tokens';

export const RECEIPT_RE = /^[A-Z]{3}[0-9]{10}$/;

export function normalizeReceipt(raw: string) {
  return raw.replace(/[\s-]/g, '').toUpperCase();
}

export function isValidReceipt(raw: string) {
  return RECEIPT_RE.test(normalizeReceipt(raw));
}

/** Centro de servicio por prefijo: nunca se le pide a la persona lo que el recibo ya dice. */
const CENTERS: Record<string, { es: string; en: string }> = {
  SRC: { es: 'Centro de Texas', en: 'Texas Service Center' },
  LIN: { es: 'Centro de Nebraska', en: 'Nebraska Service Center' },
  WAC: { es: 'Centro de California', en: 'California Service Center' },
  EAC: { es: 'Centro de Vermont', en: 'Vermont Service Center' },
  MSC: { es: 'Centro Nacional de Beneficios', en: 'National Benefits Center' },
  NBC: { es: 'Centro Nacional de Beneficios', en: 'National Benefits Center' },
  IOE: { es: 'Sistema en línea (ELIS)', en: 'Online system (ELIS)' },
  YSC: { es: 'Centro de Potomac', en: 'Potomac Service Center' },
  MCT: { es: 'Oficina de Texas (MCT)', en: 'Texas office (MCT)' },
  MGL: { es: 'Oficina de Texas (MGL)', en: 'Texas office (MGL)' },
};

export function centerFor(receipt: string, lang: 'es' | 'en') {
  const p = normalizeReceipt(receipt).slice(0, 3);
  return CENTERS[p]?.[lang] ?? (lang === 'es' ? 'Centro USCIS' : 'USCIS center');
}

/** Semáforo a partir del texto oficial del estatus. */
export function bucketFor(statusText: string | null | undefined): Semaphore {
  const s = (statusText ?? '').toLowerCase();
  if (!s) return 'neutral';
  if (/approved|card was mailed|card was delivered|new card is being produced|was issued|naturalization ceremony|priority date is current/.test(s)) return 'approved';
  if (/request for (additional |initial )?evidence|intent to deny|rejected|denied|returned|fee was declined|biometrics|interview/.test(s)) return 'action';
  return 'waiting';
}

export function daysSince(iso: string | null | undefined) {
  if (!iso) return 0;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

// "Revisado hoy 8:25 am" / "Revisado ayer" / "Revisado hace N días" — la prueba diaria de que vigilamos.
export function checkedLabel(iso: string | null | undefined, lang: 'es' | 'en') {
  if (!iso) return lang === 'es' ? 'Aún no revisado' : 'Not checked yet';
  const d = daysSince(iso);
  if (d === 0) {
    const time = new Date(iso).toLocaleTimeString(lang === 'es' ? 'es-MX' : 'en-US', { hour: 'numeric', minute: '2-digit' });
    return lang === 'es' ? `Revisado hoy ${time} · sin cambios · todo en orden` : `Checked today ${time} · no changes · all in order`;
  }
  if (d === 1) return lang === 'es' ? 'Revisado ayer · sin cambios' : 'Checked yesterday · no changes';
  return lang === 'es' ? `Revisado hace ${d} días` : `Checked ${d} days ago`;
}

export function uscisUrl() {
  return 'https://egov.uscis.gov/casestatus/landing.do';
}
