import { FORMS, NEWS, STATUSES, newsPath, rangeText, statusPath } from '@/lib/catalog';
import { SITE } from '@/lib/i18n';
export const dynamic = 'force-static';
export function GET() {
  const out: string[] = ['# CaseAlerta — full reference', ''];
  for (const f of FORMS) out.push(`## Form ${f.code}: ${f.name_en}`, f.what_en, `Typical steps: ${f.milestones_en.join(' → ')}`, rangeText('en', f) ? `Typical processing range: ${rangeText('en', f)} (USCIS published times).` : 'No single published range.', `Official: ${f.official_url}`, '');
  for (const s of STATUSES) out.push(`## USCIS status: ${s.code}`, s.meaning_en, `Next steps: ${s.next_en.join(' ')}`, `Common mistakes: ${s.mistakes_en.join(' ')}`, `Time: ${s.wait_en}`, `URL: ${SITE}${statusPath('en', s)}`, '');
  for (const a of NEWS) out.push(`## ${a.title_en}`, `Date: ${a.date} · URL: ${SITE}${newsPath('en', a)}`, '', ...a.body_en, '', 'Sources: ' + a.sources.map((x) => x.u).join('; '), '');
  return new Response(out.join('\n') + '\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
