import { FormRoute, formMeta, formParams } from '@/lib/routes';
export const dynamicParams = false;
export function generateStaticParams() { return formParams(); }
type P = { params: Promise<{ form: string }> };
export async function generateMetadata({ params }: P) { return formMeta('es', (await params).form); }
export default async function Page({ params }: P) { return <FormRoute lang="es" slug={(await params).form} />; }
