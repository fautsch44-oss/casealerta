import { ensureSession, supabase } from './supabase';
import { normalizeReceipt, uscisDate } from './receipt';
import type { Lang } from '../i18n/strings';

export type UscisStatus = {
  receipt_number: string;
  form_type: string | null;
  status_en: string | null;
  status_es: string | null;
  desc_en: string | null;
  desc_es: string | null;
  submitted: string | null;
  modified: string | null;
  history: unknown[];
};

export type CaseRow = {
  id: string;
  receipt_number: string;
  form_type: string | null;
  label: string | null;
  last_status_code: string | null;
  last_status_text: string | null;
  last_status_date: string | null;
  last_checked_at: string | null;
  last_changed_at: string | null;
  response_deadline: string | null;
  created_at: string;
  received_date: string | null;
  priority_date: string | null;
  nvc_case_number: string | null;
  nvc_invoice_id: string | null;
  nvc_status: NvcStatus | null;
  nvc_status_date: string | null;
  nvc_updated_at: string | null;
};

export type NvcStatus = 'at_nvc' | 'fees_paid' | 'ds260_submitted' | 'documents_submitted' | 'documentarily_qualified' | 'interview_scheduled' | 'administrative_processing' | 'visa_issued' | 'refused';
export const NVC_STATUSES: NvcStatus[] = ['at_nvc', 'fees_paid', 'ds260_submitted', 'documents_submitted', 'documentarily_qualified', 'interview_scheduled', 'administrative_processing', 'visa_issued', 'refused'];

/** Guarda o actualiza el tracker NVC del caso. Registra el cambio en la historia. */
export async function saveNvc(caseId: string, p: { nvc_case_number: string; nvc_invoice_id: string | null; nvc_status: NvcStatus; nvc_status_date: string | null }) {
  const session = await ensureSession();
  const prev = await getCase(caseId);
  const { error } = await supabase.from('cases').update({ ...p, nvc_updated_at: new Date().toISOString() }).eq('id', caseId);
  if (error) throw error;
  if (prev?.nvc_status !== p.nvc_status) {
    await supabase.from('case_events').insert({ case_id: caseId, owner_id: session.user.id, status_code: `NVC_${p.nvc_status.toUpperCase()}`, status_text: `NVC: ${p.nvc_status}`, status_date: p.nvc_status_date, source: 'manual' });
  }
}

export type CaseEvent = { id: string; status_text: string; status_date: string | null; detected_at: string };

export type Explanation = {
  status_title: string;
  meaning: string;
  next_steps: string[];
  typical_days_min: number | null;
  typical_days_max: number | null;
};

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0, public detail: string | null = null, public messageEs: string | null = null) {
    super(message);
  }
}

/** YUNQUE · casealerta-uscis-status: consulta puntual oficial. */
export async function lookupReceipt(raw: string): Promise<UscisStatus> {
  await ensureSession();
  const { data, error } = await supabase.functions.invoke('casealerta-uscis-status', {
    body: { receipt_number: normalizeReceipt(raw) },
  });
  if (error) {
    const ctx = (error as any)?.context;
    let body: any = null;
    try { body = ctx ? await ctx.json() : null; } catch { /* sin cuerpo */ }
    const status = ctx?.status ?? 0;
    // detail = error.message original de USCIS (criterio del demo: se muestra al usuario, además del mensaje claro).
    throw new ApiError(body?.code ?? 'uscis_error', body?.message ?? error.message, status, body?.uscis_message ?? null, body?.message_es ?? null);
  }
  return data.case as UscisStatus;
}

export async function listCases(): Promise<CaseRow[]> {
  await ensureSession();
  const { data, error } = await supabase
    .from('cases')
    .select('id, receipt_number, form_type, label, last_status_code, last_status_text, last_status_date, last_checked_at, last_changed_at, response_deadline, created_at, received_date, priority_date, nvc_case_number, nvc_invoice_id, nvc_status, nvc_status_date, nvc_updated_at')
    .eq('active', true)
    .order('last_changed_at', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as CaseRow[];
}

export async function getCase(id: string): Promise<CaseRow | null> {
  await ensureSession();
  const { data, error } = await supabase.from('cases').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as CaseRow | null;
}

export async function listEvents(caseId: string): Promise<CaseEvent[]> {
  const { data, error } = await supabase
    .from('case_events')
    .select('id, status_text, status_date, detected_at')
    .eq('case_id', caseId)
    .order('detected_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as CaseEvent[];
}

/** Guarda el caso con el estatus ya consultado y registra el primer evento. */
export async function addCase(status: UscisStatus, label: string | null): Promise<CaseRow> {
  const session = await ensureSession();
  const owner_id = session.user.id;
  const statusText = status.status_en ?? status.status_es ?? null;
  const { data: existing } = await supabase.from('cases').select('id').eq('receipt_number', status.receipt_number).maybeSingle();
  if (existing) return (await getCase(existing.id))!;
  const { data, error } = await supabase
    .from('cases')
    .insert({
      owner_id,
      receipt_number: status.receipt_number,
      form_type: status.form_type,
      label,
      last_status_code: statusText,
      last_status_text: statusText,
      last_status_date: uscisDate(status.modified),
      received_date: uscisDate(status.submitted),
      last_checked_at: new Date().toISOString(),
      last_changed_at: uscisDate(status.modified) ? `${uscisDate(status.modified)}T12:00:00Z` : new Date().toISOString(),
    })
    .select('*')
    .single();
  if (error) throw error;
  // Historia oficial de USCIS → cada paso con su fecha, visible desde el primer día.
  const hist = (status.history as { date?: string; completed_text_en?: string; completed_text_es?: string }[]).filter((h) => h?.date);
  if (hist.length) {
    await supabase.from('case_events').insert(hist.map((h) => ({
      case_id: data.id, owner_id, status_code: h.completed_text_en ?? statusText, status_text: h.completed_text_en ?? statusText,
      status_date: uscisDate(h.date), source: 'uscis_api',
    }))).then(() => null, () => null);
  }
  if (statusText && !hist.length) {
    await supabase.from('case_events').insert({
      case_id: data.id, owner_id, status_code: statusText, status_text: statusText,
      status_date: uscisDate(status.modified), source: 'manual',
    });
  }
  return data as CaseRow;
}

/** Explicación en caché (status_explanations), nunca se llama al modelo desde el cliente. */
export async function getExplanation(formType: string | null, statusText: string | null, lang: Lang): Promise<Explanation | null> {
  if (!statusText) return null;
  const form = (formType ?? '').toUpperCase().replace(/\s+/g, '');
  const q = supabase.from('status_explanations')
    .select('status_title, meaning, next_steps, typical_days_min, typical_days_max, form_type')
    .eq('lang', lang)
    .ilike('status_code', statusText);
  const { data, error } = await q;
  if (error) throw error;
  if (!data?.length) return null;
  const exact = data.find((r: any) => (r.form_type ?? '').toUpperCase().replace(/\s+/g, '') === form);
  const row: any = exact ?? data.find((r: any) => !r.form_type || r.form_type === 'ANY' || r.form_type === '*') ?? data[0];
  return {
    status_title: row.status_title, meaning: row.meaning,
    next_steps: Array.isArray(row.next_steps) ? row.next_steps : [],
    typical_days_min: row.typical_days_min, typical_days_max: row.typical_days_max,
  };
}

export async function saveProfile(p: { lang?: Lang; push_enabled?: boolean; email_enabled?: boolean; display_name?: string | null }) {
  const session = await ensureSession();
  const { error } = await supabase.from('profiles').upsert({ owner_id: session.user.id, ...p }, { onConflict: 'owner_id' });
  if (error) throw error;
}

export async function savePushToken(expo_token: string, platform: 'ios' | 'android') {
  const session = await ensureSession();
  const { error } = await supabase.from('push_tokens').upsert({ owner_id: session.user.id, expo_token, platform }, { onConflict: 'expo_token' });
  if (error) throw error;
}

export async function linkEmail(email: string) {
  await ensureSession();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export async function hasProEntitlement(): Promise<boolean> {
  const session = await ensureSession();
  const { data } = await supabase.from('subscriptions').select('status, plan')
    .eq('owner_id', session.user.id).in('status', ['trialing', 'active']).limit(1);
  return !!data?.length;
}
