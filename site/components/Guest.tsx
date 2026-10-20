'use client';
import { useRef, useState } from 'react';
import type { Lang } from '@/lib/types';
import { fn } from '@/lib/sb';

type Msg = { role: 'me' | 'bot'; text: string; upsell?: { title: string; perks: string[] } | null; ticket?: boolean };
export type WebCase = { receipt_number: string; form_type: string | null; status_en: string | null } | null;

const S = {
  es: {
    title: 'Pregúntame sobre tu caso', sub: 'Asistente con IA · No es asesoría legal',
    hello: (f?: string | null) => f ? `Hola. Ya vi tu ${f}. ¿Qué quieres saber?` : 'Hola. Pega tu número de recibo arriba o pregúntame cómo funciona un trámite.',
    sugg: ['¿Qué significa mi estatus?', '¿Cuánto tarda?', '¿Qué sigue?', '¿Cómo activo los avisos?'],
    ph: 'Escribe tu pregunta…', send: 'Enviar', ticket: 'Crear ticket: que me responda una persona', err: 'No pude conectar. Intenta de nuevo.', pro: 'Ver planes',
  },
  en: {
    title: 'Ask me about your case', sub: 'AI assistant · Not legal advice',
    hello: (f?: string | null) => f ? `Hi. I see your ${f}. What would you like to know?` : 'Hi. Paste your receipt number above or ask me how a USCIS process works.',
    sugg: ['What does my status mean?', 'How long does it take?', 'What is next?', 'How do I turn on alerts?'],
    ph: 'Type your question…', send: 'Send', ticket: 'Create a ticket: have a person reply', err: 'Could not connect. Try again.', pro: 'See plans',
  },
};

export default function Guest({ lang, webCase, plansHref }: { lang: Lang; webCase: WebCase; plansHref: string }) {
  const s = S[lang];
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const scroll = () => setTimeout(() => box.current?.scrollTo({ top: box.current.scrollHeight, behavior: 'smooth' }), 30);

  const ask = async (text: string) => {
    const m = text.trim();
    if (!m || busy) return;
    setQ(''); setMsgs((x) => [...x, { role: 'me', text: m }]); setBusy(true); scroll();
    try {
      const { status, data } = await fn('casealerta-huesped', { message: m, lang, surface: 'web', web_case: webCase });
      if (status >= 400 || !data.reply) throw new Error();
      setMsgs((x) => [...x, { role: 'bot', text: data.reply, upsell: data.upsell, ticket: !!data.offer_ticket }]);
    } catch { setMsgs((x) => [...x, { role: 'bot', text: s.err, ticket: true }]); }
    finally { setBusy(false); scroll(); }
  };

  const ticket = async () => {
    const last = [...msgs].reverse().find((x) => x.role === 'me')?.text;
    if (!last) return;
    setBusy(true);
    try {
      const { data } = await fn('casealerta-huesped', { action: 'ticket', question: last, lang, surface: 'web', web_case: webCase });
      setMsgs((x) => [...x, { role: 'bot', text: data.reply ?? s.err }]);
    } catch { setMsgs((x) => [...x, { role: 'bot', text: s.err }]); }
    finally { setBusy(false); scroll(); }
  };

  return (
    <section className="card" aria-labelledby="guest-t" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="row" style={{ gap: 12 }}>
        <span className="medal" style={{ width: 44, height: 44, minWidth: 44 }}><img src="/sello.png" alt="" width={36} height={36} /></span>
        <div><b id="guest-t" style={{ fontSize: 18 }}>{s.title}</b><div className="muted small">{s.sub}</div></div>
      </div>
      <div className="chat" ref={box} aria-live="polite">
        <div className="msg bot">{s.hello(webCase?.form_type)}</div>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: m.role === 'me' ? 'flex-end' : 'flex-start' }}>
            <div className={`msg ${m.role}`}>{m.text}</div>
            {m.upsell && <div className="upsell"><b>{m.upsell.title}</b><ul className="bul" style={{ marginTop: 6 }}>{m.upsell.perks.map((p) => <li key={p}>{p}</li>)}</ul><a className="btn small" href={plansHref}>{s.pro}</a></div>}
            {m.ticket && <button className="copy" onClick={ticket} disabled={busy}>{s.ticket}</button>}
          </div>
        ))}
        {busy && <div className="msg bot" aria-label="…">…</div>}
      </div>
      {msgs.length === 0 && <div className="sugg">{s.sugg.map((x) => <button key={x} onClick={() => ask(x)}>{x}</button>)}</div>}
      <form className="row" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <label className="skip" htmlFor="guest-q">{s.ph}</label>
        <input id="guest-q" className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder={s.ph} maxLength={1000} />
        <button className="btn red" type="submit" disabled={busy || !q.trim()}>{s.send}</button>
      </form>
    </section>
  );
}
