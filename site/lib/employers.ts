import 'server-only';
import { SUPABASE_KEY, SUPABASE_URL } from './i18n';

export type Employer = { id: string; slug: string; name: string; city: string | null; county: string | null; state: string | null };
export type Cert = { program: string; fiscal_year: number; decision_date: string | null; job_title: string | null; workers_certified: number | null; worksite_city: string | null; worksite_state: string | null; case_status: string | null };

async function rest<T>(q: string): Promise<T | null> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${q}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Accept-Profile': 'casealerta' },
      next: { revalidate: 86400 },
    });
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch { return null; }
}

export async function employerBySlug(slug: string) {
  const rows = await rest<Employer[]>(`employers?slug=eq.${encodeURIComponent(slug)}&select=id,slug,name,city,county,state&limit=1`);
  return rows?.[0] ?? null;
}
export async function certsFor(id: string) {
  return (await rest<Cert[]>(`employer_certifications?employer_id=eq.${id}&select=program,fiscal_year,decision_date,job_title,workers_certified,worksite_city,worksite_state,case_status&order=decision_date.desc&limit=500`)) ?? [];
}
export async function nearby(e: Employer) {
  if (!e.state) return [];
  const county = e.county ? `&county=eq.${encodeURIComponent(e.county)}` : '';
  return (await rest<Employer[]>(`employers?state=eq.${encodeURIComponent(e.state)}${county}&slug=neq.${encodeURIComponent(e.slug)}&select=id,slug,name,city,county,state&limit=8`)) ?? [];
}
export async function employersByState(state?: string) {
  const f = state ? `state=eq.${encodeURIComponent(state)}&` : '';
  return (await rest<Employer[]>(`employers?${f}select=id,slug,name,city,county,state&order=name.asc&limit=300`)) ?? [];
}
export async function employerCount() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/employers?select=id&limit=1`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Accept-Profile': 'casealerta', Prefer: 'count=exact' }, next: { revalidate: 86400 },
    });
    const cr = r.headers.get('content-range');
    return cr ? Number(cr.split('/')[1]) || 0 : 0;
  } catch { return 0; }
}

export function summarize(certs: Cert[]) {
  const years = Array.from(new Set(certs.map((c) => c.fiscal_year))).sort();
  const byYear = years.map((y) => ({ y, w: certs.filter((c) => c.fiscal_year === y && /certified/i.test(c.case_status ?? '')).reduce((a, c) => a + (c.workers_certified ?? 0), 0) }));
  const last = years[years.length - 1];
  const lastCerts = certs.filter((c) => c.fiscal_year === last);
  const certified = certs.filter((c) => /certified/i.test(c.case_status ?? '')).length;
  return {
    years, byYear, last, lastCerts,
    workersLast: byYear[byYear.length - 1]?.w ?? 0,
    applications: certs.length,
    pctCertified: certs.length ? Math.round((certified / certs.length) * 100) : 0,
    yearsSponsoring: years.length,
    programs: Array.from(new Set(certs.map((c) => c.program))),
  };
}
