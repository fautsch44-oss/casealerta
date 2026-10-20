import { formByCode, note, pick, rangeText, statusByCode, statusPath, w1Path, applies } from '@/lib/catalog';
import { SITE } from '@/lib/i18n';

/** API citable: qué significa un estatus de USCIS (opcionalmente para un formulario). */
export function GET(req: Request) {
  const u = new URL(req.url);
  const lang = u.searchParams.get('lang') === 'es' ? 'es' : 'en';
  const st = statusByCode(u.searchParams.get('status') ?? '');
  if (!st) return Response.json({ error: 'unknown_status', hint: 'Pass the exact USCIS status text, e.g. status=Case Was Received' }, { status: 404 });
  const form = formByCode(u.searchParams.get('form'));
  const useForm = form && applies(form, st) ? form : undefined;
  const url = `${SITE}${useForm ? w1Path(lang, useForm, st) : statusPath(lang, st)}`;
  const body = {
    status: st.code, title: lang === 'es' ? st.title_es : st.code, kind: st.kind, stage: st.stage,
    form: useForm?.code ?? null,
    meaning: (useForm && note(useForm, st, lang)) || pick(lang, st.meaning_es, st.meaning_en),
    next_steps: pick(lang, st.next_es, st.next_en),
    typical_range: useForm ? rangeText(lang, useForm) : null,
    url, source: 'CaseAlerta (casealerta.com). AI-assisted, reviewed. Not legal advice.',
  };
  return Response.json(body, { headers: { Link: `<${url}>; rel="canonical"`, 'Cache-Control': 'public, s-maxage=86400', 'Access-Control-Allow-Origin': '*' } });
}
