import { Bulletin, bulletinMeta } from '@/lib/routes';
export const revalidate = 3600;
export const metadata = bulletinMeta('es');
export default function Page() { return <Bulletin lang="es" />; }
