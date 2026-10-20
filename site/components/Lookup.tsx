'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Kind, Lang } from '@/lib/types';
import { KIND_COLOR, KIND_LABEL, VAPID_PUBLIC } from '@/lib/i18n';
import { fn, sb, session, store } from '@/lib/sb';
import type { WebCase } from './Guest';
import Guest from './Guest';

type Cat = {
  statuses: { code: string; kind: Kind; stage: string; title: string; meaning: string; next: string[]; path: string; slug: string }[];
  forms: { code: string; slug: string; name: string; short: string; range: string | null; milestones: string[]; path: string; statusBase: string }[];
};
type Hist = { date?: string; completed_text_en?: string; completed_text_es?: string };
type Case = { receipt_number: string; form_type: string | null; status_en: string | null; status_es: string | null; desc_en: string | null; desc_es: string | null; submitted: string | null; modified: string | null; history: Hist[] };

const CENTERS: Record<string, [string, string]> = {
  SRC: ['Centro de Texas', 'Texas Service Center'], LIN: ['Centro de Nebraska', 'Nebraska Service Center'], WAC: ['Centro de California', 'California Service Center'],
  EAC: ['Centro de Vermont', 'Vermont Service Center'], MSC: ['Centro Nacional de Beneficios', 'National Benefits Center'], NBC: ['Centro Nacional de Beneficios', 'National Benefits Center'],
  IOE: ['Sistema en línea (ELIS)', 'Online system (ELIS)'], YSC: ['Centro de Potomac', 'Potomac Service Center'],
};

const S = {
  es: {
    title: 'Revisa tu caso gratis', label: 'Número de recibo (13 caracteres)', go: 'Ver mi estatus', busy: 'Consultando a USCIS…',
    chips: ['Sin cuenta', 'Sin anuncios', 'Fuente oficial: USCIS'], bad: 'Son 3 letras y 10 números, por ejemplo IOE0912345678.',
    net: 'No pudimos conectar. Intenta de nuevo.', copy: 'Copiar', copied: 'Copiado', official: 'Texto oficial de USCIS', meaning: 'Qué significa', next: 'Qué sigue',
    hist: 'Historia de tu caso', full: (f: string) => `Ver explicación completa para tu ${f}`, fullAny: 'Ver explicación completa', range: (r: string) => `Rango típico de este formulario: ${r}.`,
    alertsT: 'Avísame cuando cambie', alertsS: 'Te escribo solo cuando cambie tu caso. Sin anuncios.', email: 'Tu correo', alertsGo: 'Avísame',
    alertsOk: 'Listo. Revisa tu correo y toca «Sí, avísame» para confirmar.', alertsErr: 'No pudimos activar el aviso. Revisa tu correo e intenta de nuevo.',
    push: 'Activar globo en este navegador', pushOk: 'Globo activado en este navegador.', pushNo: 'Tu navegador no permite globos. Usa el aviso por correo.',
    recent: 'Tus consultas en este navegador', confirmed: '¡Correo confirmado! Te avisamos en cuanto cambie tu caso.', off: 'Listo, apagamos los avisos por correo.',
    milestones: 'Pasos típicos de este trámite', stageNow: 'Vas aquí', consent: 'Al activar aceptas recibir correos sobre tu caso. Puedes darte de baja cuando quieras.',
    limited: 'Hicimos muchas consultas seguidas. Espera un minuto e intenta de nuevo.',
  },
  en: {
    title: 'Check your case for free', label: 'Receipt number (13 characters)', go: 'See my status', busy: 'Checking with USCIS…',
    chips: ['No account', 'No ads', 'Official source: USCIS'], bad: 'It is 3 letters and 10 digits, e.g. IOE0912345678.',
    net: 'Could not connect. Try again.', copy: 'Copy', copied: 'Copied', official: 'Official USCIS text', meaning: 'What it means', next: 'What is next',
    hist: 'Your case history', full: (f: string) => `See the full explanation for your ${f}`, fullAny: 'See the full explanation', range: (r: string) => `Typical range for this form: ${r}.`,
    alertsT: 'Alert me when it changes', alertsS: 'I only write when your case changes. No ads.', email: 'Your email', alertsGo: 'Alert me',
    alertsOk: 'Done. Check your email and tap “Yes, alert me” to confirm.', alertsErr: 'We could not turn on the alert. Check your email and try again.',
    push: 'Turn on browser notifications', pushOk: 'Notifications on in this browser.', pushNo: 'Your browser does not allow notifications. Use email alerts.',
    recent: 'Your lookups in this browser', confirmed: 'Email confirmed! We will alert you as soon as your case changes.', off: 'Done, email alerts are off.',
    milestones: 'Typical steps of this process', stageNow: 'You are here', consent: 'By turning this on you agree to receive emails about your case. Unsubscribe anytime.',
    limited: 'Too many lookups in a row. Wait a minute and try again.',
  },
};

function b64ToU8(b: string) {
  const p = '='.repeat((4 - (b.length % 4)) % 4);
  const raw = atob((b + p).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export default function Lookup({ lang, plansHref, compact = false }: { lang: Lang; plansHref: string; compact?: boolean }) {
  const s = S[lang];
  const [cat, setCat] = useState<Cat>({ statuses: [], forms: [] });
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [c, setC] = useState<Case | null>(null);
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [alert, setAlert] = useState<{ ok: boolean; text: string } | null>(null);
  const [pushMsg, setPushMsg] = useState<string | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    setRecent(store.get<string[]>('ca-recent', []));
    fetch(`/catalog-${lang}.json`).then((r) => r.json()).then(setCat).catch(() => null);
    const q = new URLSearchParams(location.search).get('alertas');
    if (q === 'ok') setBanner(s.confirmed); else if (q === 'off') setBanner(s.off);
  }, [s.confirmed, s.off, lang]);

  const st = useMemo(() => (c?.status_en ? cat.statuses.find((x) => x.code.toLowerCase() === c.status_en!.toLowerCase()) : undefined), [c, cat]);
  const fm = useMemo(() => (c?.form_type ? cat.forms.find((f) => f.code.toUpperCase() === c.form_type!.toUpperCase().replace(/\s+/g, '')) : undefined), [c, cat]);
  const kind: Kind = st?.kind ?? 'ok';
  const center = c ? CENTERS[c.receipt_number.slice(0, 3)]?.[lang === 'es' ? 0 : 1] : null;
  const webCase: WebCase = c ? { receipt_number: c.receipt_number, form_type: c.form_type, status_en: c.status_en } : null;

  async function look(raw: string) {
    const r = raw.replace(/[\s-]/g, '').toUpperCase();
    setErr(null); setAlert(null);
    if (!/^[A-Z]{3}[0-9]{10}$/.test(r)) { setErr(s.bad); return; }
    setBusy(true); setC(null);
    try {
      const { status, data } = await fn('casealerta-uscis-status', { receipt_number: r });
      if (status === 429) { setErr(s.limited); return; }
      if (status >= 400 || !data?.ok) { setErr((lang === 'es' && data?.message_es) || data?.message || s.net); return; }
      setC(data.case as Case);
      const next = [r, ...store.get<string[]>('ca-recent', []).filter((x) => x !== r)].slice(0, 5);
      store.set('ca-recent', next); setRecent(next);
      setTimeout(() => document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    } catch { setErr(s.net); } finally { setBusy(false); }
  }

  async function subscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!c) return;
    setAlert(null);
    try {
      const { status, data } = await fn('casealerta-web-alerts', { action: 'subscribe', email, lang, case: c });
      setAlert(status < 400 && data.ok ? { ok: true, text: s.alertsOk } : { ok: false, text: data?.message ?? s.alertsErr });
    } catch { setAlert({ ok: false, text: s.alertsErr }); }
  }

  async function push() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) { setPushMsg(s.pushNo); return; }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { setPushMsg(s.pushNo); return; }
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID_PUBLIC) }));
      const ses = await session();
      if (c) {
        const { data: ex } = await sb().from('cases').select('id').eq('receipt_number', c.receipt_number).maybeSingle();
        if (!ex) await sb().from('cases').insert({ owner_id: ses.user.id, receipt_number: c.receipt_number, form_type: c.form_type, last_status_code: c.status_en, last_status_text: c.status_en, last_checked_at: new Date().toISOString() });
      }
      const { error } = await sb().from('push_tokens').insert({ owner_id: ses.user.id, platform: 'web', web_subscription: sub.toJSON(), user_agent: navigator.userAgent.slice(0, 200) });
      if (error && !/duplicate/i.test(error.message)) throw error;
      await sb().from('profiles').upsert({ owner_id: ses.user.id, lang, web_push_enabled: true }, { onConflict: 'owner_id' });
      setPushMsg(s.pushOk);
    } catch { setPushMsg(s.pushNo); }
  }

  const histItems = (c?.history ?? []).filter((h) => h.date).slice(0, 12);
  const curMilestone = (() => {
    if (!fm || !st) return -1;
    const order = ['intake', 'biometrics', 'review', 'evidence', 'interview', 'decision', 'card', 'closed'];
    const i = order.indexOf(st.stage);
    if (i < 0) return -1;
    return Math.min(fm.milestones.length - 1, Math.round((i / (order.length - 1)) * (fm.milestones.length - 1)));
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card lookup" id="consulta">
        {banner && <p className="ok" role="status">{banner}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 800 }}>
          <span className="ic" style={{ background: '#E6EEFA', color: 'var(--blue)', width: 44, height: 44, minWidth: 44 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          </span>{s.title}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); look(v); }} noValidate>
          <label htmlFor="rcpt">{s.label}</label>
          <input id="rcpt" className="input rcpt" value={v} onChange={(e) => setV(e.target.value)} inputMode="text" autoComplete="off" placeholder="IOE0912345678" maxLength={16} aria-describedby="rcpt-err" />
          <button className="btn full" type="submit" disabled={busy}>{busy ? s.busy : s.go}</button>
        </form>
        <div className="chips">{s.chips.map((x) => <span className="chip" key={x}>{x}</span>)}</div>
        {err && <p id="rcpt-err" className="err" role="alert">{err}</p>}
        {!c && recent.length > 0 && (
          <div style={{ marginTop: 12 }}><div className="muted small" style={{ fontWeight: 700 }}>{s.recent}</div>
            <div className="chips">{recent.map((r) => <button key={r} className="copy" onClick={() => { setV(r); look(r); }}>{r}</button>)}</div></div>
        )}
      </div>

      {c && (
        <div id="resultado" style={{ display: 'flex', flexDirection: 'column', gap: 16, scrollMarginTop: 90 }}>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12, borderTop: `6px solid ${KIND_COLOR[kind].fg}` }}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="badge" style={{ background: KIND_COLOR[kind].bg, color: KIND_COLOR[kind].fg }}>{KIND_LABEL[lang][kind]}</span>
              <span className="row" style={{ gap: 6 }}>
                <b style={{ letterSpacing: 1 }}>{c.receipt_number}</b>
                <button className="copy" onClick={() => { navigator.clipboard?.writeText(c.receipt_number).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}>{copied ? s.copied : s.copy}</button>
              </span>
            </div>
            <div className="muted small" style={{ fontWeight: 700 }}>{[c.form_type, fm?.short, center].filter(Boolean).join(' · ')}</div>
            <h2 style={{ margin: 0, fontSize: 24 }}>{st?.title ?? (lang === 'es' ? c.status_es ?? c.status_en : c.status_en)}</h2>
            {st && <div className="bubble"><span className="medal"><img src="/sello.png" alt="" width={44} height={44} /></span><div className="say" style={{ fontSize: 16 }}>{st.meaning}</div></div>}
            {st && st.next.length > 0 && <div><b>{s.next}</b><ol className="steps" style={{ marginTop: 8 }}>{st.next.map((x) => <li key={x}>{x}</li>)}</ol></div>}
            {(lang === 'es' ? c.desc_es ?? c.desc_en : c.desc_en) && (
              <details><summary style={{ fontWeight: 700, cursor: 'pointer' }}>{s.official}</summary><p className="small" style={{ color: '#3B4663' }}>{lang === 'es' ? c.desc_es ?? c.desc_en : c.desc_en}</p></details>
            )}
            {fm?.range && <p style={{ margin: 0 }}><b>{s.range(fm.range)}</b></p>}
            {st && <a className="btn ghost small" href={fm ? `${fm.statusBase}${fm.slug}/${st.slug}/` : st.path}>{fm ? s.full(fm.code) : s.fullAny}</a>}
          </div>

          {(histItems.length > 0 || (fm && fm.milestones.length > 0)) && (
            <div className="grid2" style={{ gap: 16 }}>
              {histItems.length > 0 && (
                <div className="card main"><b>{s.hist}</b>
                  <ol className="timeline" style={{ marginTop: 12 }}>
                    {histItems.map((h, i) => <li key={i} className={i === 0 ? 'on' : 'done'}>{(lang === 'es' ? h.completed_text_es ?? h.completed_text_en : h.completed_text_en) ?? ''}<small>{h.date}</small></li>)}
                  </ol></div>
              )}
              {fm && fm.milestones.length > 0 && (
                <div className="card side"><b>{s.milestones}</b>
                  <ol className="timeline" style={{ marginTop: 12 }}>
                    {fm.milestones.map((m, i) => <li key={m} className={i === curMilestone ? 'on' : i < curMilestone ? 'done' : ''}>{m}{i === curMilestone && <small>{s.stageNow}</small>}</li>)}
                  </ol></div>
              )}
            </div>
          )}

          <div className="card navy" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <b style={{ fontSize: 20 }}>{s.alertsT}</b><span style={{ color: '#D6E0F2' }}>{s.alertsS}</span>
            <form className="row" onSubmit={subscribe}>
              <label className="skip" htmlFor="al-email">{s.email}</label>
              <input id="al-email" className="input" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={s.email} />
              <button className="btn red" type="submit">{s.alertsGo}</button>
            </form>
            <span className="small" style={{ color: '#D6E0F2' }}>{s.consent}</span>
            {alert && <p className={alert.ok ? 'ok' : 'err'} style={{ background: '#fff', borderRadius: 10, padding: '8px 12px', margin: 0 }} role="status">{alert.text}</p>}
            <button className="btn ghost small" style={{ alignSelf: 'flex-start' }} onClick={push} type="button">{s.push}</button>
            {pushMsg && <span className="small" role="status">{pushMsg}</span>}
          </div>
        </div>
      )}

      {!compact && <Guest lang={lang} webCase={webCase} plansHref={plansHref} />}
    </div>
  );
}
