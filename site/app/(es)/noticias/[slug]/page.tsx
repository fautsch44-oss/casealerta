import { NewsRoute, newsMeta, newsParams } from '@/lib/routes';
export const dynamicParams = false;
export function generateStaticParams() { return newsParams('es'); }
type P = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: P) { return newsMeta('es', (await params).slug); }
export default async function Page({ params }: P) { return <NewsRoute lang="es" slug={(await params).slug} />; }
