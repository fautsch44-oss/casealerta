'use client';
// Cuenta perezosa: nadie se registra al entrar. El correo se pide solo para guardar el plan y usarlo en otro aparato.
import type { Lang } from './types';
import { fn, sb } from './sb';
import { track } from '@/components/Analytics';

export async function currentEmail(): Promise<string | null> {
  try { const { data } = await sb().auth.getSession(); return data.session?.user.email ?? null; } catch { return null; }
}

export async function sendCode(email: string, lang: Lang): Promise<{ ok: boolean; message?: string }> {
  const { status, data } = await fn('casealerta-account', { action: 'send_code', email, lang });
  track(status < 400 ? 'login_code_sent' : 'error_shown', status < 400 ? {} : { where: 'login_send', code: String(data?.code ?? status) });
  return status < 400 && data?.ok ? { ok: true } : { ok: false, message: data?.message };
}

/** Verifica el código. Si ya existía una cuenta con ese correo, cambia a esa sesión (sus casos de aquí se mudan allá). */
export async function verifyCode(email: string, code: string, lang: Lang): Promise<{ ok: boolean; message?: string; switched?: boolean }> {
  const { status, data } = await fn('casealerta-account', { action: 'verify', email, code, lang });
  if (status >= 400 || !data?.ok) { track('error_shown', { where: 'login_verify', code: String(data?.code ?? status) }); return { ok: false, message: data?.message }; }
  if (data.mode === 'switch' && data.token_hash) {
    const { error } = await sb().auth.verifyOtp({ token_hash: data.token_hash, type: 'magiclink' });
    if (error) { track('error_shown', { where: 'login_switch', code: error.message }); return { ok: false }; }
    track('login_completed', { mode: 'switch' });
    return { ok: true, switched: true };
  }
  await sb().auth.refreshSession().catch(() => null);
  track('login_completed', { mode: 'linked' });
  return { ok: true, switched: false };
}
