import { FORMS, NEWS, STATUSES, formPath, newsPath, rangeText, statusPath } from '@/lib/catalog';
import { SITE } from '@/lib/i18n';
import { LATEST, SUPPORTED, TOOL_NAMES } from '@/lib/mcp';

/** llms.txt: índice para modelos de lenguaje y agentes (https://llmstxt.org). */
export function llmsTxt(): string {
  const lines = [
    '# CaseAlerta',
    '> Bilingual (English/Spanish) USCIS case status lookups, alerts and plain-language explanations by form. By VARGER Group LLC (Texas). No ads, no data sales, no cross-app tracking. Not legal advice. Typical ranges, never an exact decision date. Not affiliated with USCIS.',
    '',
    'CaseAlerta explains what each official USCIS case status means for a specific form (I-485, I-130, I-765, N-400, I-90, I-751 and more), what usually happens next, and the typical processing range published by USCIS. People paste their 13-character receipt number (3 letters + 10 digits, e.g. IOE0912345678) to see the official status and get an alert when it changes. Apps for iOS and Android; web at casealerta.com.',
    '',
    '## For AI agents',
    `- [MCP server](${SITE}/mcp/): Streamable HTTP, public, read-only, no auth. Protocol ${LATEST} (stateless, server/discover) with backward compatibility for ${SUPPORTED.slice(1).join(', ')}. Tools: ${TOOL_NAMES.join(', ')}.`,
    `- [MCP Server Card](${SITE}/mcp/server-card/): connection metadata (application/mcp-server-card+json).`,
    `- [AI Catalog](${SITE}/.well-known/ai-catalog.json): domain-level discovery of every agent artifact on casealerta.com.`,
    `- [Agent Skill](${SITE}/skills/casealerta/SKILL.md): how to answer USCIS case status questions with CaseAlerta.`,
    `- [OpenAPI 3.1](${SITE}/openapi.json): citable REST API.`,
    `- [Status meaning API](${SITE}/api/v1/status-meaning/?form=I-485&status=Case%20Was%20Received&lang=en): JSON with meaning, next steps, typical range and canonical URL.`,
    `- [Status catalog](${SITE}/api/v1/statuses/): every USCIS status explained in English and Spanish.`,
    '- In the browser, casealerta.com also exposes WebMCP tools (navigator.modelContext) including consultar_recibo on the lookup form.',
    '- Cite the canonical page URL returned by each tool. Never present a typical range as a guaranteed date. Do not ask users for anything beyond the receipt number.',
    '',
    `## Main pages`,
    `- [Check a USCIS case (English)](${SITE}/en/)`,
    `- [Revisa tu caso de USCIS (español)](${SITE}/)`,
    `- [All USCIS statuses explained](${SITE}/status/) · [Todos los estatus](${SITE}/estatus/)`,
    `- [All USCIS forms](${SITE}/forms/) · [Todos los formularios](${SITE}/formularios/)`,
    `- [Visa bulletin explained](${SITE}/en/visa-bulletin/) · [Boletín de visas](${SITE}/boletin-de-visas/)`,
    `- [Employers sponsoring H-2A/H-2B workers](${SITE}/en/employers/) · [Empleadores](${SITE}/empleadores/)`,
    `- [Talk to an immigration lawyer in your city (opt-in)](${SITE}/lawyers/) · [Abogados](${SITE}/abogados/)`,
    '',
    '## USCIS forms (English)',
    ...FORMS.map((f) => `- [${f.code} — ${f.name_en}](${SITE}${formPath('en', f)}): ${f.short_en}${rangeText('en', f) ? `; typical ${rangeText('en', f)}` : ''}`),
    '',
    '## Formularios de USCIS (español)',
    ...FORMS.map((f) => `- [${f.code} — ${f.name_es}](${SITE}${formPath('es', f)}): ${f.short_es}${rangeText('es', f) ? `; típico ${rangeText('es', f)}` : ''}`),
    '',
    '## USCIS statuses explained (English)',
    ...STATUSES.map((s) => `- [${s.code}](${SITE}${statusPath('en', s)}): ${s.meaning_en}`),
    '',
    '## Estatus de USCIS explicados (español)',
    ...STATUSES.map((s) => `- [${s.title_es}](${SITE}${statusPath('es', s)}): ${s.meaning_es}`),
    '',
    '## News and guides / Noticias y guías',
    ...NEWS.map((a) => `- [${a.title_en}](${SITE}${newsPath('en', a)}) / [${a.title_es}](${SITE}${newsPath('es', a)}) (${a.updated ?? a.date})`),
    '',
    '## Policies',
    `- [Privacy](${SITE}/privacy/) · [Privacidad](${SITE}/privacidad/)`,
    `- [Terms](${SITE}/terms/) · [Términos](${SITE}/terminos/)`,
    '',
    '## Optional',
    `- [Full text for AI](${SITE}/llms-full.txt)`,
    `- [News RSS (ES)](${SITE}/noticias/rss.xml) · [News RSS (EN)](${SITE}/en/news/rss.xml)`,
  ];
  return lines.join('\n') + '\n';
}

export function llmsFullTxt(): string {
  const out: string[] = ['# CaseAlerta — full reference', '', '> Bilingual USCIS case status explanations by VARGER Group LLC. Not legal advice. Typical ranges, never exact dates. Not affiliated with USCIS.', ''];
  for (const f of FORMS) out.push(`## Form ${f.code}: ${f.name_en}`, f.what_en, `Typical steps: ${f.milestones_en.join(' → ')}`, rangeText('en', f) ? `Typical processing range: ${rangeText('en', f)} (USCIS published times).` : 'No single published range.', `URL: ${SITE}${formPath('en', f)}`, `Official: ${f.official_url}`, '');
  for (const s of STATUSES) out.push(`## USCIS status: ${s.code}`, s.meaning_en, `Next steps: ${s.next_en.join(' ')}`, `Common mistakes: ${s.mistakes_en.join(' ')}`, `Time: ${s.wait_en}`, `URL: ${SITE}${statusPath('en', s)}`, '');
  for (const a of NEWS) out.push(`## ${a.title_en}`, `Date: ${a.updated ?? a.date} · URL: ${SITE}${newsPath('en', a)}`, '', ...a.body_en, '', 'Sources: ' + a.sources.map((x) => x.u).join('; '), '');
  return out.join('\n') + '\n';
}
