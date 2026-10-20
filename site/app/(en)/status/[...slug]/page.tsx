import { StatusRoute, statusMeta, statusParams } from '@/lib/routes';
export const dynamicParams = true; // el resto se genera en la primera visita y queda en caché
export const revalidate = false;
export function generateStaticParams() { return statusParams('en'); }
type P = { params: Promise<{ slug: string[] }> };
export async function generateMetadata({ params }: P) { return statusMeta('en', (await params).slug); }
export default async function Page({ params }: P) { return <StatusRoute lang="en" slug={(await params).slug} />; }
