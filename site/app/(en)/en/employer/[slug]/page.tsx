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
  return meta('en', `${e.name}: ${s.programs.join(" and ")} workers certified · CaseAlerta`,
    `${e.name} (${e.city ?? ""}, ${e.state ?? ""}): ${s.workersLast} workers certified in ${s.last}, ${s.applications} applications, public DOL data.`,
    employerPath('en', slug), employerPath('es', slug));
}
export default async function Page({ params }: Props) {
  const { slug } = await params; const e = await employerBySlug(slug); if (!e) notFound();
  const [certs, near] = await Promise.all([certsFor(e.id), nearby(e)]);
  return <W2 lang="en" e={e} certs={certs} near={near} />;
}
