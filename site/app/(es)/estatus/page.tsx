import { StatusIndex, statusIndexMeta } from '@/lib/routes';
export const metadata = statusIndexMeta('es');
export default function Page() { return <StatusIndex lang="es" />; }
