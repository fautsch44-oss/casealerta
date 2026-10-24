'use client';
// "Quiero hablar con un abogado en mi ciudad" — solo por botón del usuario y con su consentimiento. Nunca anuncio.
import { useState } from 'react';
import type { Lang } from '@/lib/types';
import { sb } from '@/lib/sb';
import { track } from './Analytics';

const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','PR','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];

const L = {
  es: {
    h1: 'Habla con un abogado de inmigración en tu ciudad', lead: 'Tú decides. Nos dejas tu ciudad y tu correo, y un despacho de tu zona te escribe. Nunca vendemos tus datos ni ponemos anuncios.',
    city: 'Ciudad', state: 'Estado', email: 'Correo', phone: 'Teléfono (opcional)', form: 'Formulario (opcional)', topic: '¿Sobre qué quieres hablar? (opcional)',
    consent: 'Acepto que CaseAlerta comparta estos datos solo con un despacho de inmigración de mi ciudad para que me contacte.',
    send: 'Quiero que me contacten', sending: 'Enviando…', ok: 'Listo. Un despacho de tu ciudad te escribirá a tu correo. Si no quieres seguir, ignora el mensaje.',
    err: 'No se pudo enviar. Revisa tu correo y tu ciudad e intenta de nuevo.', b1: 'Solo un despacho de tu ciudad', b2: 'Tú das el primer paso', b3: 'Sin anuncios, sin venta de datos',
    note: 'CaseAlerta no es un despacho de abogados y no da asesoría legal. La consulta y sus costos los acuerdas directamente con el despacho.',
  },
  en: {
    h1: 'Talk to an immigration lawyer in your city', lead: 'Your choice. Leave your city and email, and a local firm will write to you. We never sell your data or show ads.',
    city: 'City', state: 'State', email: 'Email', phone: 'Phone (optional)', form: 'Form (optional)', topic: 'What do you want to talk about? (optional)',
    consent: 'I agree that CaseAlerta shares this information only with an immigration firm in my city so they can contact me.',
    send: 'Have a lawyer contact me', sending: 'Sending…', ok: 'Done. A firm in your city will email you. If you do not want to continue, just ignore it.',
    err: 'Could not send. Check your email and city and try again.', b1: 'Only one firm in your city', b2: 'You take the first step', b3: 'No ads, no data selling',
    note: 'CaseAlerta is not a law firm and does not give legal advice. You agree on the consultation and its cost directly with the firm.',
  },
};

export default function Lawyers({ lang }: { lang: Lang }) {
  const l = L[lang];
  const [f, setF] = useState({ city: '', state: 'TX', email: '', phone: '', form_type: '', topic: '', consent: false });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(null);
    const { error } = await sb().from('lawyer_optins').insert({
      city: f.city.trim(), state: f.state, email: f.email.trim().toLowerCase(), phone: f.phone.trim() || null,
      form_type: f.form_type.trim().toUpperCase() || null, topic: f.topic.trim() || null, lang, source: 'web', consent: f.consent,
    });
    setBusy(false);
    if (error) { setMsg({ ok: false, t: l.err }); track('error_shown', { where: 'lawyer_optin', code: error.code ?? 'insert' }); return; }
    setMsg({ ok: true, t: l.ok }); track('lawyer_optin', { state: f.state });
  }

  return (
    <>
      <section className="hero slim"><div className="wrap"><h1>{l.h1}</h1><p className="lead">{l.lead}</p></div></section>
      <main className="wrap main-pull">
        <div className="tiles" style={{ marginBottom: 16 }}>
          {[l.b1, l.b2, l.b3].map((b) => <div className="tile" key={b}><b>✓ {b}</b></div>)}
        </div>
        <div className="card" style={{ maxWidth: 640 }}>
          {msg?.ok ? <p className="ok" role="status" style={{ fontSize: 17 }}>{msg.t}</p> : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: 4 }}><span className="small muted">{l.city}</span>
                  <input className="input" required minLength={2} maxLength={80} value={f.city} onChange={set('city')} autoComplete="address-level2" placeholder="Houston" style={{ height: 48 }} /></label>
                <label style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: 4 }}><span className="small muted">{l.state}</span>
                  <select className="input" value={f.state} onChange={set('state')} style={{ height: 48 }}>{STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span className="small muted">{l.email}</span>
                <input className="input" type="email" required autoComplete="email" value={f.email} onChange={set('email')} placeholder={lang === 'es' ? 'tu@correo.com' : 'you@email.com'} style={{ height: 48 }} /></label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <label style={{ flex: '1 1 160px', display: 'flex', flexDirection: 'column', gap: 4 }}><span className="small muted">{l.phone}</span>
                  <input className="input" type="tel" maxLength={30} autoComplete="tel" value={f.phone} onChange={set('phone')} style={{ height: 48 }} /></label>
                <label style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: 4 }}><span className="small muted">{l.form}</span>
                  <input className="input" maxLength={20} value={f.form_type} onChange={set('form_type')} placeholder="I-485" style={{ height: 48 }} /></label>
              </div>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><span className="small muted">{l.topic}</span>
                <textarea className="input" maxLength={500} rows={3} value={f.topic} onChange={set('topic')} style={{ paddingTop: 10 }} /></label>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <input type="checkbox" required checked={f.consent} onChange={set('consent')} style={{ width: 22, height: 22, marginTop: 2 }} />
                <span className="small">{l.consent}</span></label>
              <button className="btn red" type="submit" disabled={busy || !f.consent} style={{ minHeight: 52 }}>{busy ? l.sending : l.send}</button>
              {msg && !msg.ok && <p className="err" role="alert">{msg.t}</p>}
            </form>
          )}
          <p className="muted small" style={{ marginTop: 14 }}>{l.note}</p>
        </div>
      </main>
    </>
  );
}
