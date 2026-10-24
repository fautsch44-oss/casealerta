import PayReturn from '@/components/PayReturn';
import { Shell } from '@/components/Shell';
import { P } from '@/lib/i18n';
export const metadata = { title: 'Confirming your payment · CaseAlerta', robots: { index: false, follow: false } };
export default function Page() { return <Shell lang="en" alt={P['es'].pay}><PayReturn lang="en" /></Shell>; }
