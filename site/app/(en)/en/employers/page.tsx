import { W2Index } from '@/components/W2';
import { employerCount, employersByState } from '@/lib/employers';
import { meta } from '@/lib/meta';
import { P } from '@/lib/i18n';
export const revalidate = 86400;
export const metadata = meta('en', "Employers sponsoring H-2A and H-2B workers · CaseAlerta", "Who brought H-2A and H-2B workers, where and how many, from public Department of Labor data.", P['en'].employers, P['es'].employers);
type Props = { searchParams: Promise<{ estado?: string; state?: string }> };
export default async function Page({ searchParams }: Props) {
  const sp = await searchParams; const st = (sp.estado ?? sp.state ?? '').toUpperCase().slice(0, 2) || undefined;
  const [list, total] = await Promise.all([employersByState(st), employerCount()]);
  return <W2Index lang="en" list={list} total={total} state={st} />;
}
