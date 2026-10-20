'use client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './i18n';

let client: SupabaseClient<any, any, any> | null = null;
export function sb(): SupabaseClient<any, any, any> {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { db: { schema: 'casealerta' }, auth: { persistSession: true, storageKey: 'casealerta-web' } });
  return client;
}

export async function session() {
  const c = sb();
  const { data } = await c.auth.getSession();
  if (data.session) return data.session;
  const { data: d, error } = await c.auth.signInAnonymously();
  if (error || !d.session) throw error ?? new Error('no_session');
  return d.session;
}

export async function fn<T = any>(name: string, body: unknown): Promise<{ status: number; data: T }> {
  const s = await session();
  const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: SUPABASE_KEY, Authorization: `Bearer ${s.access_token}` },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  return { status: r.status, data };
}

export const store = {
  get<T>(k: string, d: T): T { try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d; } catch { return d; } },
  set(k: string, v: unknown) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ } },
};
