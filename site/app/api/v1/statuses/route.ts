import { STATUSES } from '@/lib/catalog';
export const dynamic = 'force-static';
/** Catálogo abierto de estatus de USCIS explicados (ES/EN). Citable. */
export function GET() {
  return Response.json({ source: 'CaseAlerta (casealerta.com). AI-assisted, reviewed. Not legal advice.', updated: '2026-10-20', statuses: STATUSES },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=86400' } });
}
