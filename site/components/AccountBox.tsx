'use client';
// Guardar el plan con el correo (código de 6 dígitos). Dos pasos, sin contraseñas, sin perder lo escrito.
import { useEffect, useRef, useState } from 'react';
import type { Lang } from '@/lib/types';
import { currentEmail, sendCode, verifyCode } from '@/lib/account';

const S = {
  es: {
    titleSave: 'Guarda tu plan con tu correo', subSave: 'Así lo usas en tu celular, otra computadora o la app. Sin contraseña: te mandamos un código.',
    titleIn: 'Entra con tu correo', subIn: 'Si ya pagaste en otro aparato, escribe el correo que usaste y te mandamos un código.',
    email: 'Tu correo', send: 'Mandar código', sending: 'Mandando…', codeLbl: (e: string) => `Escribe el código de 6 dígitos que mandamos a ${e}`,
    verify: 'Confirmar', verifying: 'Confirmando…', change: 'Cambiar correo', resend: 'Mandar otro código',
    done: (e: string) => `Listo. Tu plan está guardado en ${e}.`, saved: (e: string) => `Tu plan está guardado en ${e}.`,
    err: 'No pudimos completar el paso. Intenta de nuevo.', spam: '¿No llega? Revisa la carpeta de spam o promociones.',
  },
  en: {
    titleSave: 'Save your plan with your email', subSave: 'Use it on your phone, another computer or the app. No password: we send you a code.',
    titleIn: 'Sign in with your email', subIn: 'If you already paid on another device, enter the email you used and we will send you a code.',
    email: 'Your email', send: 'Send code', sending: 'Sending…', codeLbl: (e: string) => `Enter the 6-digit code we sent to ${e}`,
    verify: 'Confirm', verifying: 'Confirming…', change: 'Change email', resend: 'Send another code',
    done: (e: string) => `Done. Your plan is saved to ${e}.`, saved: (e: string) => `Your plan is saved to ${e}.`,
    err: 'We could not complete this step. Try again.', spam: 'Not arriving? Check your spam or promotions folder.',
  },
};

export default function AccountBox({ lang, mode = 'save', onDone, initialEmail }: { lang: Lang; mode?: 'save' | 'signin'; onDone?: (switched: boolean) => void; initialEmail?: string | null }) {
  const s = S[lang];
  const [linked, setLinked] = useState<string | null>(null);
  const [step, setStep] = useState<'email' | 'code' | 'done'>('email');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (mode === 'save') currentEmail().then(setLinked); }, [mode]);
  useEffect(() => { if (step === 'code') codeRef.current?.focus(); }, [step]);

  if (mode === 'save' && linked && step !== 'done') return <p className="ok" role="status" style={{ margin: 0 }}>{s.saved(linked)}</p>;

  async function send(e?: React.FormEvent) {
    e?.preventDefault();
    if (busy) return;
    setErr(null); setBusy(true);
    const r = await sendCode(email.trim(), lang).catch(() => ({ ok: false } as { ok: boolean; message?: string }));
    setBusy(false);
    if (r.ok) { setStep('code'); setCode(''); } else setErr(r.message ?? s.err);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy || code.length !== 6) return;
    setErr(null); setBusy(true);
    const r = await verifyCode(email.trim(), code, lang).catch(() => ({ ok: false } as { ok: boolean; message?: string; switched?: boolean }));
    setBusy(false);
    if (r.ok) { setStep('done'); onDone?.(!!r.switched); } else setErr(r.message ?? s.err);
  }

  return (
    <div className="acct" aria-live="polite">
      {step !== 'done' && <><b style={{ fontSize: 17 }}>{mode === 'save' ? s.titleSave : s.titleIn}</b><span className="small muted">{mode === 'save' ? s.subSave : s.subIn}</span></>}
      {step === 'email' && (
        <form className="row" onSubmit={send}>
          <label className="skip" htmlFor="acct-email">{s.email}</label>
          <input id="acct-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={s.email} />
          <button className="btn" type="submit" disabled={busy || !email.includes('@')} aria-busy={busy}>{busy ? s.sending : s.send}</button>
        </form>
      )}
      {step === 'code' && (<>
        <form className="row" onSubmit={verify}>
          <label htmlFor="acct-code" className="small" style={{ width: '100%', fontWeight: 700 }}>{s.codeLbl(email.trim())}</label>
          <input id="acct-code" ref={codeRef} className="input code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
          <button className="btn red" type="submit" disabled={busy || code.length !== 6} aria-busy={busy}>{busy ? s.verifying : s.verify}</button>
        </form>
        <span className="small muted">{s.spam} <button type="button" className="linkBtn" onClick={() => send()}>{s.resend}</button> · <button type="button" className="linkBtn" onClick={() => { setStep('email'); setErr(null); }}>{s.change}</button></span>
      </>)}
      {step === 'done' && <p className="ok" role="status" style={{ margin: 0 }}>{s.done(email.trim())}</p>}
      {err && <p className="err" role="alert" style={{ margin: 0 }}>{err}</p>}
    </div>
  );
}
