import PayReturn from '@/components/PayReturn';
import { Shell } from '@/components/Shell';
import { P } from '@/lib/i18n';
export const metadata = { title: 'Confirmando tu pago · CaseAlerta', robots: { index: false, follow: false } };
export default function Page() { return <Shell lang="es" alt={P['en'].pay}><PayReturn lang="es" /></Shell>; }
