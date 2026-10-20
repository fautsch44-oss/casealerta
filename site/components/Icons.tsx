import type { Kind } from '@/lib/types';
import { KIND_COLOR } from '@/lib/i18n';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const Search = ({ s = 22 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.4}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>;
export const Bell = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>;
export const Spark = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /></svg>;
export const Shield = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" /><path d="M9 12l2 2 4-4" /></svg>;
export const Globe = ({ s = 18 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>;
export const Clock = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const Alert = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></svg>;
export const Check = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M5 12l5 5 9-10" /></svg>;
export const X = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P} strokeWidth={2.4}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Doc = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><path d="M6 2h9l5 5v15H6z" /><path d="M14 2v6h6M9 13h8M9 17h6" /></svg>;
export const Cal = ({ s = 26 }: { s?: number }) => <svg width={s} height={s} viewBox="0 0 24 24" {...P}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>;

const KI: Record<Kind, (p: { s?: number }) => React.ReactElement> = { ok: Clock, act: Alert, good: Check, bad: X };

export function KindIcon({ k, size = 56 }: { k: Kind; size?: number }) {
  const c = KIND_COLOR[k];
  const I = KI[k];
  return <span className="ic" style={{ background: c.bg, color: c.fg, width: size, height: size, minWidth: size }}><I s={Math.round(size * 0.46)} /></span>;
}

export function KindBadge({ k, label }: { k: Kind; label: string }) {
  const c = KIND_COLOR[k];
  const I = KI[k];
  return <span className="badge" style={{ background: c.bg, color: c.fg }}><I s={16} />{label}</span>;
}
