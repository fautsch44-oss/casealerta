import { NewsIndex, newsIndexMeta } from '@/lib/routes';
export const metadata = newsIndexMeta('es');
export default function Page() { return <NewsIndex lang="es" />; }
