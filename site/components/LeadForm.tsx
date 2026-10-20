'use client';
import { useState } from 'react';
import type { Lang } from '@/lib/types';
import { sb } from '@/lib/sb';

export default function LeadForm({ lang, slug, label, cta }: { lang: Lang; slug: string; label: string; cta: string }) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const es = lang === 'es';
  return (
    <form onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setMsg(null);
      const { error } = await sb().from('b2b_leads').insert({ email: email.trim().toLowerCase(), employer_slug: slug, kind: 'pdf_report', lang });
      setBusy(false);
      setMsg(error ? { ok: false, t: es ? 'Revisa tu correo e intenta de nuevo.' : 'Check your email and try again.' } : { ok: true, t: es ? 'Listo. Te mandamos el reporte en menos de 24 horas.' : 'Done. We will send the report within 24 hours.' });
    }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <label htmlFor={`lead-${slug}`} className="muted small" style={{ fontWeight: 600 }}>{label}</label>
      <input id={`lead-${slug}`} className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={es ? 'tu@empresa.com' : 'you@company.com'} style={{ height: 48, fontSize: 15 }} />
      <button className="btn small" type="submit" disabled={busy} style={{ minHeight: 48 }}>{cta}</button>
      {msg && <span className={msg.ok ? 'ok' : 'err'} role="status">{msg.t}</span>}
    </form>
  );
}
