'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Kind, Lang } from '@/lib/types';
import { fn, sb, session } from '@/lib/sb';
import { PLAN_NAME, PORTAL, checkout, mySubs, type MySub } from '@/lib/billing';
import { track } from './Analytics';

type Org = { id: string; name: string; kind: 'employer' | 'law_firm' };
type Row = { id: string; receipt_number: string; form_type: string | null; beneficiary_name: string | null; program: string | null; last_status_text: string | null; last_changed_at: string | null; created_at: string };
type Cat = { statuses: { code: string; kind: Kind; title: string }[] };
type Bucket = 'act' | 'changed' | 'approved' | 'waiting';

const C = { act: ['#C8102E', '#FCE8EB'], changed: ['#E8A33D', '#FFF4DB'], approved: ['#1E7A46', '#E3F5EA'], waiting: ['#D4A84B', '#F3F6FB'] } as const;
const S = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
const ic = {
  grid: <svg width="16" height="16" viewBox="0 0 24 24" {...S} strokeWidth={2.4}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>,
  team: <svg width="16" height="16" viewBox="0 0 24 24" {...S} strokeWidth={2.2}><circle cx="9" cy="8" r="3" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.5" /></svg>,
  bill: <svg width="16" height="16" viewBox="0 0 24 24" {...S} strokeWidth={2.2}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18" /></svg>,
  down: <svg width="18" height="18" viewBox="0 0 24 24" {...S} strokeWidth={2.2}><path d="M12 4v12M7 11l5 5 5-5" /><path d="M4 20h16" /></svg>,
  up: <svg width="18" height="18" viewBox="0 0 24 24" {...S} strokeWidth={2.4}><path d="M12 20V8M7 13l5-5 5 5" /><path d="M4 4h16" /></svg>,
  alert: <svg width="26" height="26" viewBox="0 0 24 24" {...S} strokeWidth={2.2}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>,
  bell: <svg width="26" height="26" viewBox="0 0 24 24" {...S} strokeWidth={2.2}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>,
  ok: <svg width="26" height="26" viewBox="0 0 24 24" {...S} strokeWidth={2.4}><path d="M5 12l5 5 9-10" /></svg>,
  clock: <svg width="26" height="26" viewBox="0 0 24 24" {...S} strokeWidth={2.2}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  search: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5B6478" strokeWidth={2.4} strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>,
  mail: <svg width="22" height="22" viewBox="0 0 24 24" {...S} strokeWidth={2}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></svg>,
  shield: <svg width="14" height="14" viewBox="0 0 24 24" {...S} strokeWidth={2.2}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /></svg>,
};

const T = {
  es: {
    dash: 'Tablero', team: 'Equipo', billing: 'Pago', title: 'Tablero de peticiones', exp: 'Exportar', imp: 'Importar recibos',
    need: (n: number) => n ? `${n} ${n === 1 ? 'petición necesita' : 'peticiones necesitan'} tu atención hoy. Lo demás va en orden.` : 'Todo va en orden. Te aviso en cuanto algo cambie.',
    of: (n: number) => `de ${n}`, approved: 'Aprobadas', waiting: 'En espera', changed: 'Cambió esta semana', act: 'Actuar ya', evidence: 'Requieren acción', avg: 'Días promedio en espera',
    workers: 'TRABAJADORES', all: 'Todos', searchPh: 'Buscar', sendsTo: (n: number) => `${n} ${n === 1 ? 'persona recibe' : 'personas reciben'} un correo en menos de 5 minutos`, noAds: 'Sin anuncios · sin compartir datos', manage: 'Administrar equipo',
    startT: 'Crea tu tablero', startS: 'Escribe el nombre de tu empresa o despacho. Luego pega tus números de recibo.', company: 'Nombre de la empresa', kind: 'Tipo', employer: 'Empleador', firm: 'Despacho de abogados', create: 'Crear tablero',
    impT: 'Pega tus recibos', impS: 'Uno por línea: recibo, nombre del trabajador, programa (opcional). Hasta 50 por vez.', impGo: 'Importar', importing: (a: number, b: number) => `Consultando a USCIS… ${a} de ${b}`, impDone: (n: number, e: number) => `Listo: ${n} importados${e ? `, ${e} con error` : ''}.`, cancel: 'Cerrar',
    capped: (n: number) => `Importamos ${n}. Tu tablero de muestra tiene 3 peticiones. Activa la prueba de 14 días para cargar hasta 50.`,
    payT: 'Activa tu prueba de 14 días', payS: (y: boolean) => `$0 hoy. Luego $99 al mes${y ? ' (o $990 al año)' : ''}. Cancela cuando quieras desde tu portal.`, payGo: 'Empezar prueba gratis', payYear: 'Prefiero pagar anual: $990', opening: 'Abriendo pago seguro…', payErr: 'No pudimos abrir el pago. Intenta de nuevo.',
    planOn: (p: string, d: string | null) => d ? `Plan ${p} · prueba hasta el ${d}` : `Plan ${p} activo`, manageBill: 'Administrar pago',
    empty: 'Aún no hay peticiones. Toca «Importar recibos» para empezar.', day: (n: number) => `día ${n}`, trial: 'Prueba de 14 días · luego $99/mes',
    note: 'Datos oficiales de USCIS. Explicaciones con IA, no es asesoría legal.', waitingDay: (n: number) => `En espera · día ${n}`, changedOn: 'Cambió', approvedOn: 'Aprobada',
  },
  en: {
    dash: 'Dashboard', team: 'Team', billing: 'Billing', title: 'Petitions dashboard', exp: 'Export', imp: 'Import receipts',
    need: (n: number) => n ? `${n} ${n === 1 ? 'petition needs' : 'petitions need'} you today. Everything else is on track.` : 'Everything is on track. I will alert you the moment something changes.',
    of: (n: number) => `of ${n}`, approved: 'Approved', waiting: 'Waiting', changed: 'Changed this week', act: 'Act now', evidence: 'Need action', avg: 'Avg. days waiting',
    workers: 'WORKERS', all: 'All', searchPh: 'Search', sendsTo: (n: number) => `${n} ${n === 1 ? 'person gets' : 'people get'} an email in under 5 minutes`, noAds: 'No ads · no data sharing', manage: 'Manage team',
    startT: 'Create your dashboard', startS: 'Type your company or law firm name. Then paste your receipt numbers.', company: 'Company name', kind: 'Type', employer: 'Employer', firm: 'Law firm', create: 'Create dashboard',
    impT: 'Paste your receipts', impS: 'One per line: receipt, worker name, program (optional). Up to 50 at a time.', impGo: 'Import', importing: (a: number, b: number) => `Checking with USCIS… ${a} of ${b}`, impDone: (n: number, e: number) => `Done: ${n} imported${e ? `, ${e} with errors` : ''}.`, cancel: 'Close',
    capped: (n: number) => `Imported ${n}. Your sample dashboard holds 3 petitions. Start the 14-day trial to load up to 50.`,
    payT: 'Start your 14-day trial', payS: (y: boolean) => `$0 today. Then $99 a month${y ? ' (or $990 a year)' : ''}. Cancel anytime from your portal.`, payGo: 'Start free trial', payYear: 'I prefer yearly: $990', opening: 'Opening secure checkout…', payErr: 'We could not open checkout. Try again.',
    planOn: (p: string, d: string | null) => d ? `${p} plan · trial until ${d}` : `${p} plan active`, manageBill: 'Manage billing',
    empty: 'No petitions yet. Tap “Import receipts” to start.', day: (n: number) => `day ${n}`, trial: '14-day trial · then $99/mo',
    note: 'Official USCIS data. AI-assisted explanations, not legal advice.', waitingDay: (n: number) => `Waiting · day ${n}`, changedOn: 'Changed', approvedOn: 'Approved',
  },
};

const days = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5)) : 0);
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '··';

export default function B1({ lang }: { lang: Lang }) {
  const t = T[lang];
  const [org, setOrg] = useState<Org | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [cat, setCat] = useState<Cat>({ statuses: [] });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'act' | string>('all');
  const [q, setQ] = useState('');
  const [showImp, setShowImp] = useState(false);
  const [text, setText] = useState('');
  const [prog, setProg] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'employer' | 'law_firm'>('employer');
  const [team, setTeam] = useState(1);
  const [sub, setSub] = useState<MySub | null>(null);
  const [paying, setPaying] = useState(false);
  const [payErr, setPayErr] = useState<string | null>(null);
  const [capped, setCapped] = useState(false);

  const load = useCallback(async () => {
    const s = await session();
    const { data: orgs } = await sb().from('orgs').select('id,name,kind').order('created_at').limit(1);
    const o = (orgs?.[0] as Org | undefined) ?? null;
    setOrg(o);
    if (o) {
      const { data } = await sb().from('cases').select('id,receipt_number,form_type,beneficiary_name,program,last_status_text,last_changed_at,created_at').eq('org_id', o.id).eq('active', true).order('last_changed_at', { ascending: false, nullsFirst: false });
      setRows((data as Row[]) ?? []);
      const { count } = await sb().from('org_members').select('owner_id', { count: 'exact', head: true }).eq('org_id', o.id).eq('receives_alerts', true);
      setTeam(Math.max(1, count ?? 1));
      setSub((await mySubs(o.id))[0] ?? null);
    }
    void s;
    setLoading(false);
  }, []);

  useEffect(() => {
    load().catch(() => setLoading(false));
    fetch(`/catalog-${lang}.json`).then((r) => r.json()).then(setCat).catch(() => null);
    const reset = () => setPaying(false);
    window.addEventListener('pageshow', reset);
    const pre = new URLSearchParams(location.search).get('empresa');
    if (pre) setName(pre.replace(/-[a-z]{2}$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
    return () => window.removeEventListener('pageshow', reset);
  }, [load, lang]);

  const kindOf = useCallback((txt: string | null): Kind => cat.statuses.find((s) => s.code.toLowerCase() === (txt ?? '').toLowerCase())?.kind ?? 'ok', [cat]);
  const titleOf = (txt: string | null) => cat.statuses.find((s) => s.code.toLowerCase() === (txt ?? '').toLowerCase())?.title ?? txt ?? '';
  const bucketOf = useCallback((r: Row): Bucket => {
    const k = kindOf(r.last_status_text);
    if (k === 'act' || k === 'bad') return 'act';
    if (k === 'good') return 'approved';
    if (days(r.last_changed_at) <= 7) return 'changed';
    return 'waiting';
  }, [kindOf]);

  const counts = useMemo(() => {
    const c = { act: 0, changed: 0, approved: 0, waiting: 0 } as Record<Bucket, number>;
    rows.forEach((r) => { c[bucketOf(r)]++; });
    return c;
  }, [rows, bucketOf]);
  const total = rows.length;
  const waitingRows = rows.filter((r) => bucketOf(r) !== 'approved');
  const avg = waitingRows.length ? Math.round(waitingRows.reduce((a, r) => a + days(r.last_changed_at ?? r.created_at), 0) / waitingRows.length) : 0;
  const programs = Array.from(new Set(rows.map((r) => r.program).filter(Boolean))) as string[];
  const shown = rows.filter((r) => (filter === 'all' || (filter === 'act' ? bucketOf(r) === 'act' : r.program === filter)) &&
    (!q || `${r.beneficiary_name ?? ''} ${r.receipt_number} ${r.form_type ?? ''}`.toLowerCase().includes(q.toLowerCase())));

  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  const a = pct(counts.approved), w = a + pct(counts.waiting), ch = w + pct(counts.changed);
  const donut = total ? `conic-gradient(#1E7A46 0 ${a}%, #D4A84B ${a}% ${w}%, #E8A33D ${w}% ${ch}%, #C8102E ${ch}% 100%)` : '#E3E8F0';

  async function createOrg(e: React.FormEvent) {
    e.preventDefault();
    const s = await session();
    const { data, error } = await sb().from('orgs').insert({ owner_id: s.user.id, name: name.trim().slice(0, 120), kind }).select('id,name,kind').single();
    if (!error && data) { setOrg(data as Org); setShowImp(true); }
  }

  async function runImport() {
    if (!org) return;
    const s = await session();
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean).slice(0, 50);
    let ok = 0, bad = 0, hitCap = false;
    for (let i = 0; i < lines.length; i++) {
      setProg(t.importing(i + 1, lines.length));
      const [rc, nm, pg] = lines[i].split(/[,;\t]/).map((x) => x.trim());
      const receipt = (rc ?? '').replace(/[\s-]/g, '').toUpperCase();
      if (!/^[A-Z]{3}[0-9]{10}$/.test(receipt)) { bad++; continue; }
      try {
        const { status, data } = await fn('casealerta-uscis-status', { receipt_number: receipt });
        const c = status < 400 && data?.ok ? data.case : null;
        const { error } = await sb().from('cases').insert({
          owner_id: s.user.id, org_id: org.id, receipt_number: receipt, beneficiary_name: nm || null, program: pg || null,
          form_type: c?.form_type ?? null, last_status_code: c?.status_en ?? null, last_status_text: c?.status_en ?? null, last_checked_at: new Date().toISOString(),
        });
        if (error && /plan_limit/.test(error.message)) { hitCap = true; break; }
        if (error) bad++; else ok++;
      } catch { bad++; }
    }
    setProg(hitCap ? t.capped(ok) : t.impDone(ok, bad)); setCapped(hitCap); if (!hitCap) setText('');
    if (hitCap) track('paywall_viewed', { reason: 'b2b_case_limit' });
    await load();
  }

  function exportCsv() {
    const head = ['receipt', 'worker', 'program', 'form', 'status', 'days_in_status'];
    const body = rows.map((r) => [r.receipt_number, r.beneficiary_name ?? '', r.program ?? '', r.form_type ?? '', r.last_status_text ?? '', String(days(r.last_changed_at ?? r.created_at))]);
    const csv = [head, ...body].map((l) => l.map((x) => `"${x.replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const aEl = document.createElement('a'); aEl.href = url; aEl.download = 'casealerta-peticiones.csv'; aEl.click(); URL.revokeObjectURL(url);
  }

  const planKey = org?.kind === 'law_firm' ? 'law_firm' as const : 'employer' as const;
  async function startTrial(interval: 'month' | 'year') {
    if (!org || paying) return;
    setPayErr(null); setPaying(true);
    const ok = await checkout(planKey, interval, { lang, from: location.pathname, orgId: org.id, reason: 'b2b_dashboard' });
    if (!ok) { setPaying(false); setPayErr(t.payErr); }
  }
  const trialDate = sub?.trial_ends_at ? new Date(sub.trial_ends_at).toLocaleDateString(lang === 'es' ? 'es-MX' : 'en-US', { day: 'numeric', month: 'long' }) : null;
  const payBar = org && !sub ? (
    <div id="pago" className="trialBar" role="region" aria-label={t.billing}>
      <span className="ic" style={{ width: 44, height: 44, minWidth: 44, background: 'var(--gold)', color: 'var(--navy)' }}>{ic.bill}</span>
      <span style={{ display: 'flex', flexDirection: 'column', flex: '1 1 240px' }}><b style={{ fontSize: 17 }}>{t.payT}</b><span className="small">{t.payS(planKey === 'employer')}</span></span>
      <span className="row" style={{ gap: 8 }}>
        <button type="button" className="btn red small" disabled={paying} aria-busy={paying} onClick={() => startTrial('month')}>{paying ? t.opening : t.payGo}</button>
        {planKey === 'employer' && <button type="button" className="btn ghost small" disabled={paying} onClick={() => startTrial('year')}>{t.payYear}</button>}
      </span>
      {payErr && <span className="err" role="alert" style={{ width: '100%' }}>{payErr}</span>}
    </div>
  ) : null;
  useEffect(() => { if (payBar && rows.length > 0) track('paywall_viewed', { reason: 'b2b_dashboard', rows: rows.length }); }, [!!payBar, rows.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpi = [
    { k: 'act' as const, n: counts.act, label: t.evidence, icon: ic.alert, fg: '#C8102E', bg: '#FCE8EB', dot: '#C8102E' },
    { k: 'changed' as const, n: counts.changed, label: t.changed, icon: ic.bell, fg: '#9A6400', bg: '#FFF4DB', dot: '#E8A33D' },
    { k: 'approved' as const, n: counts.approved, label: t.approved, icon: ic.ok, fg: '#1E7A46', bg: '#E3F5EA', dot: '#1E7A46' },
    { k: 'waiting' as const, n: avg, label: t.avg, icon: ic.clock, fg: '#1F4FA0', bg: '#E6EEFA', dot: '#1F4FA0' },
  ];

  return (
    <>
      <div className="b1bar"><div className="wrap row" style={{ justifyContent: 'space-between' }}>
        <nav className="row" aria-label="B2B">
          <a className="b1tab on" href="#">{ic.grid}{t.dash}</a>
          <a className="b1tab" href="#equipo">{ic.team}{t.team}</a>
          <a className="b1tab" href="#pago">{ic.bill}{t.billing}</a>
        </nav>
        {org && <span className="row" style={{ gap: 10, fontSize: 13, fontWeight: 700 }}><span className="avatar gold">{initials(org.name)}</span>{org.name}</span>}
      </div></div>

      <section className="hero" style={{ padding: '30px 0 74px' }}><div className="wrap row" style={{ justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 32 }}>{t.title}</h1>
          <div className="bubble"><span className="medal" style={{ width: 48, height: 48, minWidth: 48 }}><img src="/sello.png" alt="" width={40} height={40} /></span><div className="say" style={{ fontSize: 15, padding: '10px 16px' }}>{org ? t.need(counts.act) : t.startS}</div></div>
        </div>
        {org && <div className="row">
          <button className="btn small" style={{ background: '#fff', color: 'var(--navy)' }} onClick={exportCsv} disabled={!rows.length}>{ic.down}{t.exp}</button>
          <button className="btn small red" onClick={() => setShowImp(true)}>{ic.up}{t.imp}</button>
        </div>}
      </div></section>

      <main className="wrap" style={{ marginTop: -48, position: 'relative', display: 'flex', flexDirection: 'column', gap: 20, paddingBottom: 40 }}>
        {loading ? <div className="card">…</div> : !org ? (
          <form className="card" onSubmit={createOrg} style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 560 }}>
            <b style={{ fontSize: 20 }}>{t.startT}</b><span className="muted">{t.startS}</span>
            <label htmlFor="org-n" className="small muted" style={{ fontWeight: 700 }}>{t.company}</label>
            <input id="org-n" className="input" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} />
            <div className="row" role="radiogroup" aria-label={t.kind}>
              {(['employer', 'law_firm'] as const).map((k) => <button type="button" key={k} aria-pressed={kind === k} className="copy" style={{ height: 40, background: kind === k ? 'var(--blue)' : undefined, color: kind === k ? '#fff' : undefined }} onClick={() => setKind(k)}>{k === 'employer' ? t.employer : t.firm}</button>)}
            </div>
            <button className="btn red" type="submit">{t.create}</button>
            <span className="muted small">{t.trial} · {t.note}</span>
          </form>
        ) : (
          <>
            {rows.length > 0 && payBar}
            <div className="row" style={{ alignItems: 'stretch', gap: 16 }}>
              <div className="tile" style={{ flex: '1 1 300px', flexDirection: 'row', alignItems: 'center', gap: 22 }}>
                <div className="ring" style={{ width: 150, height: 150, minWidth: 150, borderRadius: 75, background: donut }}><div style={{ width: 104, height: 104, borderRadius: 52 }}><span style={{ fontSize: 34, fontWeight: 800, lineHeight: 1 }}>{total}</span><span className="ringSmall">{t.of(sub ? (sub.plan === 'employer_250' || sub.plan === 'law_firm_3' ? 250 : 50) : 3)}</span></div></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 14, fontWeight: 700 }}>
                  {[['#1E7A46', counts.approved, t.approved], ['#D4A84B', counts.waiting, t.waiting], ['#E8A33D', counts.changed, t.changed], ['#C8102E', counts.act, t.act]].map(([c, n, l]) => <span key={String(l)} className="row" style={{ gap: 8 }}><span style={{ width: 12, height: 12, borderRadius: 6, background: String(c) }} />{n} {l}</span>)}
                </div>
              </div>
              <div style={{ flex: '2 1 520px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
                {kpi.map((x) => <button key={x.k} onClick={() => setFilter(x.k === 'act' ? 'act' : 'all')} style={{ border: 0, textAlign: 'left', font: 'inherit', cursor: 'pointer', background: x.bg, borderRadius: 22, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}><span className="ic" style={{ width: 54, height: 54, minWidth: 54, background: x.dot, color: '#fff' }}>{x.icon}</span><span style={{ display: 'flex', flexDirection: 'column' }}><b style={{ fontSize: 30, color: x.fg, lineHeight: 1 }}>{x.n}</b><span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy)' }}>{x.label}</span></span></button>)}
              </div>
            </div>

            <div className="row">
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--muted)', letterSpacing: '.6px' }}>{t.workers}</span>
              <button className={`fchip${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>{t.all} {total}</button>
              <button className={`fchip red${filter === 'act' ? ' on' : ''}`} onClick={() => setFilter('act')}>{t.act} {counts.act}</button>
              {programs.map((p) => <button key={p} className={`fchip${filter === p ? ' on' : ''}`} onClick={() => setFilter(p)}>{p}</button>)}
              <label className="fsearch">{ic.search}<input type="search" aria-label={t.searchPh} placeholder={t.searchPh} value={q} onChange={(e) => setQ(e.target.value)} /></label>
            </div>

            {shown.length === 0 ? <div className="card muted">{t.empty}</div> : (
              <div className="wcards">
                {shown.map((r) => {
                  const b = bucketOf(r); const [fg, bg] = C[b];
                  const label = b === 'act' ? titleOf(r.last_status_text) : b === 'approved' ? `${t.approvedOn} · ${titleOf(r.last_status_text)}` : b === 'changed' ? `${t.changedOn}: ${titleOf(r.last_status_text)}` : t.waitingDay(days(r.last_changed_at ?? r.created_at));
                  return (
                    <div key={r.id} className="tile" style={{ gap: 12, padding: 16, borderTop: `5px solid ${fg}` }}>
                      <div className="row" style={{ gap: 10, flexWrap: 'nowrap' }}><span className="avatar">{initials(r.beneficiary_name ?? r.receipt_number.slice(0, 3))}</span>
                        <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}><b style={{ fontSize: 15 }}>{r.beneficiary_name ?? r.receipt_number}</b><span className="muted" style={{ fontSize: 12 }}>{[r.form_type, r.program, r.beneficiary_name ? r.receipt_number : null].filter(Boolean).join(' · ')}</span></span></div>
                      <span style={{ alignSelf: 'flex-start', fontSize: 12, fontWeight: 800, color: b === 'waiting' ? 'var(--navy)' : fg === '#E8A33D' ? '#9A6400' : fg, background: bg, borderRadius: 12, padding: '5px 10px' }}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}

            <div id="equipo" className="tile" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 18px' }}>
              <span className="ic" style={{ width: 44, height: 44, minWidth: 44, background: '#E6EEFA', color: 'var(--blue)' }}>{ic.mail}</span>
              <b style={{ fontSize: 14 }}>{t.sendsTo(team)}</b>
              <span className="chip" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>{ic.shield}{t.noAds}</span>
              {sub
                ? <span className="row" style={{ marginLeft: 'auto', gap: 8 }}><span id="pago" className="pill g">{t.planOn(PLAN_NAME[lang][sub.plan] ?? sub.plan, sub.status === 'trialing' ? trialDate : null)}</span><a className="btn ghost small" href={PORTAL} target="_blank" rel="noopener">{t.manageBill}</a></span>
                : <span className="muted small" style={{ marginLeft: 'auto' }}>{t.trial}</span>}
            </div>
            {rows.length === 0 && payBar}
            <p className="muted small">{t.note}</p>
          </>
        )}
      </main>

      {showImp && org && (
        <div role="dialog" aria-modal="true" aria-labelledby="imp-t" className="modalBg" onClick={(e) => { if (e.target === e.currentTarget) setShowImp(false); }}>
          <div className="card" style={{ width: 'min(560px, 100%)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <b id="imp-t" style={{ fontSize: 20 }}>{t.impT}</b><span className="muted small">{t.impS}</span>
            <label htmlFor="imp-x" className="skip">{t.impT}</label>
            <textarea id="imp-x" className="input" style={{ height: 200, padding: 12, fontFamily: 'ui-monospace,monospace', fontSize: 14, textTransform: 'none' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'EAC9999103403, Luis Hernández, H-2A\nLIN9999106498, Rosa Pérez, H-2A'} />
            {prog && <span className="ok" role="status">{prog}</span>}
            {capped && payBar}
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn ghost small" onClick={() => setShowImp(false)}>{t.cancel}</button>
              <button className="btn red small" onClick={runImport} disabled={!text.trim()}>{t.impGo}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
