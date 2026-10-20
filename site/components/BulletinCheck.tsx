'use client';
import { useState } from 'react';
import type { Lang } from '@/lib/types';

type Row = { category: string; chargeability: string; cutoff_date: string | null; status: string };

export default function BulletinCheck({ lang, rows, cats, countries }: { lang: Lang; rows: Row[]; cats: [string, string][]; countries: [string, string][] }) {
  const es = lang === 'es';
  const [cat, setCat] = useState('F2A');
  const [ctry, setCtry] = useState('MX');
  const [pd, setPd] = useState('');
  const r = rows.find((x) => x.category === cat && x.chargeability === ctry) ?? rows.find((x) => x.category === cat && x.chargeability === 'ALL');
  let verdict: { ok: boolean; text: string } | null = null;
  if (pd && r) {
    if (r.status === 'current') verdict = { ok: true, text: es ? 'Tu categoría está al día: tu fecha de prioridad ya puede avanzar este mes.' : 'Your category is current: your priority date can move this month.' };
    else if (r.cutoff_date) {
      const ok = pd < r.cutoff_date;
      const days = Math.round((+new Date(pd) - +new Date(r.cutoff_date)) / 864e5);
      verdict = ok
        ? { ok: true, text: es ? `Sí: tu fecha (${pd}) es anterior a la del boletín (${r.cutoff_date}). Tu caso puede avanzar este mes.` : `Yes: your date (${pd}) is earlier than the bulletin date (${r.cutoff_date}). Your case can move this month.` }
        : { ok: false, text: es ? `Todavía no: al boletín le faltan unos ${Math.ceil(days / 30)} meses para llegar a tu fecha. Te avisamos cuando avance.` : `Not yet: the bulletin is about ${Math.ceil(days / 30)} months away from your date. We will alert you when it moves.` };
    }
  }
  return (
    <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
      <label className="small" style={{ fontWeight: 700 }}>{es ? 'Categoría' : 'Category'}
        <select className="input" value={cat} onChange={(e) => setCat(e.target.value)}>{cats.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="small" style={{ fontWeight: 700 }}>{es ? 'País de nacimiento' : 'Country of birth'}
        <select className="input" value={ctry} onChange={(e) => setCtry(e.target.value)}>{countries.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      <label className="small" style={{ fontWeight: 700 }}>{es ? 'Tu fecha de prioridad' : 'Your priority date'}
        <input className="input" type="date" value={pd} onChange={(e) => setPd(e.target.value)} /></label>
      <div style={{ gridColumn: '1/-1' }} aria-live="polite">
        {verdict && <p className={verdict.ok ? 'ok' : 'err'} style={{ fontSize: 16, margin: 0 }}>{verdict.text}</p>}
        {!pd && <p className="muted small" style={{ margin: 0 }}>{es ? 'La fecha de prioridad está en tu aviso I-797 del I-130 o I-140.' : 'Your priority date is on the I-797 notice for your I-130 or I-140.'}</p>}
      </div>
    </div>
  );
}
