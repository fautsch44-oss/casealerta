import { notFound } from 'next/navigation';
import { W2, employerPath } from '@/components/W2';
import { certsFor, employerBySlug, nearby, summarize } from '@/lib/employers';
import { meta } from '@/lib/meta';
export const revalidate = 86400;
export const dynamicParams = true;
export function generateStaticParams() { return []; }
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props) {
  const { slug } = await params; const e = await employerBySlug(slug); if (!e) return {};
  const s = summarize(await certsFor(e.id));
  return meta('es', `${e.name}: trabajadores ${s.programs.join(" y ")} certificados · CaseAlerta`,
    `${e.name} (${e.city ?? ""}, ${e.state ?? ""}): ${s.workersLast} trabajadores certificados en ${s.last}, ${s.applications} solicitudes, datos públicos del DOL.`,
    employerPath('es', slug), employerPath('en', slug));
}
export default async function Page({ params }: Props) {
  const { slug } = await params; const e = await employerBySlug(slug); if (!e) notFound();
  const [certs, near] = await Promise.all([certsFor(e.id), nearby(e)]);
  return <W2 lang="es" e={e} certs={certs} near={near} />;
}
