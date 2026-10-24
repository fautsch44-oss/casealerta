import { FORMS, NEWS, STATUSES, formPath, newsPath, rangeText, statusPath } from '@/lib/catalog';
import { SITE } from '@/lib/i18n';
export const dynamic = 'force-static';
export function GET() {
  const lines = [
    '# CaseAlerta',
    '> Bilingual (English/Spanish) USCIS case status lookups, alerts and plain-language explanations by form. By VARGER Group LLC. No ads, no data sales. Not legal advice.',
    '',
    `Citable API: ${SITE}/api/v1/status-meaning?form=I-485&status=Case%20Was%20Received&lang=en`,
    `MCP server (Streamable HTTP, protocol 2025-06-18, read-only): ${SITE}/mcp/ — tools: explicar_estatus, tiempo_tipico, buscar_formulario`,
    `Visa bulletin explained: ${SITE}/en/visa-bulletin/ · ${SITE}/boletin-de-visas/`,
    '',
    '## USCIS forms (English)',
    ...FORMS.map((f) => `- [${f.code} — ${f.name_en}](${SITE}${formPath('en', f)}): ${f.short_en}${rangeText('en', f) ? `; typical ${rangeText('en', f)}` : ''}`),
    '',
    '## USCIS statuses explained (English)',
    ...STATUSES.map((s) => `- [${s.code}](${SITE}${statusPath('en', s)}): ${s.meaning_en}`),
    '',
    '## Estatus de USCIS explicados (español)',
    ...STATUSES.map((s) => `- [${s.title_es}](${SITE}${statusPath('es', s)}): ${s.meaning_es}`),
    '',
    '## News and guides / Noticias y guías',
    ...NEWS.map((a) => `- [${a.title_en}](${SITE}${newsPath('en', a)}) / [${a.title_es}](${SITE}${newsPath('es', a)}) (${a.date})`),
    '',
    '## Policies', `- [Privacy](${SITE}/privacy/)`, `- [Terms](${SITE}/terms/)`, '', `Full text for AI: ${SITE}/llms-full.txt`,
  ];
  return new Response(lines.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
