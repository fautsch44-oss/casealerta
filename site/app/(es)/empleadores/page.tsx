import { W2Index } from '@/components/W2';
import { employerCount, employersByState } from '@/lib/employers';
import { meta } from '@/lib/meta';
import { P } from '@/lib/i18n';
export const revalidate = 86400;
export const metadata = meta('es', "Empleadores que patrocinan trabajadores H-2A y H-2B · CaseAlerta", "Quién trajo trabajadores con visas H-2A y H-2B, dónde y cuántos, con datos públicos del Departamento de Trabajo.", P['es'].employers, P['en'].employers);
type Props = { searchParams: Promise<{ estado?: string; state?: string }> };
export default async function Page({ searchParams }: Props) {
  const sp = await searchParams; const st = (sp.estado ?? sp.state ?? '').toUpperCase().slice(0, 2) || undefined;
  const [list, total] = await Promise.all([employersByState(st), employerCount()]);
  return <W2Index lang="es" list={list} total={total} state={st} />;
}
