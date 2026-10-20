import { supabase } from './supabase';
import type { Lang } from '../i18n/strings';

export const CATEGORIES = ['F1', 'F2A', 'F2B', 'F3', 'F4', 'EB1', 'EB2', 'EB3', 'EB3_OW', 'EB4', 'EB5'] as const;
export const COUNTRIES = ['ALL', 'MX', 'CN', 'IN', 'PH'] as const;
export type Category = (typeof CATEGORIES)[number];
export type Country = (typeof COUNTRIES)[number];

export const CATEGORY_LABEL: Record<Category, { es: string; en: string }> = {
  F1: { es: 'F1 · Hijos solteros de ciudadanos', en: 'F1 · Unmarried children of citizens' },
  F2A: { es: 'F2A · Cónyuges e hijos de residentes', en: 'F2A · Spouses & children of residents' },
  F2B: { es: 'F2B · Hijos solteros (21+) de residentes', en: 'F2B · Unmarried adult children of residents' },
  F3: { es: 'F3 · Hijos casados de ciudadanos', en: 'F3 · Married children of citizens' },
  F4: { es: 'F4 · Hermanos de ciudadanos', en: 'F4 · Siblings of citizens' },
  EB1: { es: 'EB-1 · Prioridad', en: 'EB-1 · Priority workers' },
  EB2: { es: 'EB-2 · Grado avanzado / NIW', en: 'EB-2 · Advanced degree / NIW' },
  EB3: { es: 'EB-3 · Profesional / calificado', en: 'EB-3 · Skilled / professional' },
  EB3_OW: { es: 'EB-3 · Otros trabajadores', en: 'EB-3 · Other workers' },
  EB4: { es: 'EB-4 · Especial', en: 'EB-4 · Special immigrants' },
  EB5: { es: 'EB-5 · Inversionista', en: 'EB-5 · Investor' },
};
export const COUNTRY_LABEL: Record<Country, { es: string; en: string }> = {
  ALL: { es: 'Otros países', en: 'All other countries' },
  MX: { es: 'México', en: 'Mexico' },
  CN: { es: 'China', en: 'China' },
  IN: { es: 'India', en: 'India' },
  PH: { es: 'Filipinas', en: 'Philippines' },
};

export type BulletinRow = { bulletin_month: string; chart: string; category: string; chargeability: string; cutoff_date: string | null; status: 'date' | 'current' | 'unavailable' };

/** Última fila del boletín para categoría + país (Dates for Filing). */
export async function latestBulletin(category: Category, country: Country): Promise<BulletinRow | null> {
  const { data, error } = await supabase
    .from('visa_bulletin')
    .select('bulletin_month, chart, category, chargeability, cutoff_date, status')
    .eq('chart', 'dates_for_filing').eq('category', category).eq('chargeability', country)
    .order('bulletin_month', { ascending: false }).limit(1);
  if (error) throw error;
  return (data?.[0] as BulletinRow) ?? null;
}

/** Historial de cortes (últimos 6 meses) para la gráfica de avance. */
export async function bulletinHistory(category: Category, country: Country): Promise<BulletinRow[]> {
  const { data, error } = await supabase
    .from('visa_bulletin')
    .select('bulletin_month, chart, category, chargeability, cutoff_date, status')
    .eq('chart', 'dates_for_filing').eq('category', category).eq('chargeability', country)
    .order('bulletin_month', { ascending: false }).limit(6);
  if (error) throw error;
  return ((data ?? []) as BulletinRow[]).reverse();
}

export type Verdict = 'current' | 'not_yet' | 'unavailable';
export function verdict(row: BulletinRow | null, priority: string | null): { v: Verdict; daysBehind: number } {
  if (!row || !priority) return { v: 'not_yet', daysBehind: 0 };
  if (row.status === 'unavailable') return { v: 'unavailable', daysBehind: 0 };
  if (row.status === 'current' || !row.cutoff_date) return { v: 'current', daysBehind: 0 };
  const cut = new Date(row.cutoff_date).getTime(), pd = new Date(priority).getTime();
  if (pd < cut) return { v: 'current', daysBehind: 0 };
  return { v: 'not_yet', daysBehind: Math.round((pd - cut) / 86400000) };
}

export function fmtDate(iso: string | null | undefined, lang: Lang) {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function fmtMonth(iso: string, lang: Lang) {
  const d = new Date(iso + (iso.length === 10 ? 'T12:00:00' : ''));
  return d.toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { month: 'long', year: 'numeric' });
}

export async function saveBulletinPrefs(caseId: string, p: { priority_date: string | null; preference_category: Category | null; chargeability: Country | null; bulletin_alert: boolean }) {
  const { error } = await supabase.from('cases').update(p).eq('id', caseId);
  if (error) throw error;
}
