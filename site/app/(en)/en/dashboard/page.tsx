import B1 from '@/components/B1';
import { Shell } from '@/components/Shell';
import { meta } from '@/lib/meta';
import { P } from '@/lib/i18n';
export const metadata = { ...meta('en', "Petitions dashboard for employers and law firms · CaseAlerta", "Every worker petition on one board, with a traffic light and team alerts. 14-day trial.", P['en'].dashboard, P['es'].dashboard), robots: { index: true, follow: true } };
export default function Page() { return <Shell lang="en" alt={P['es'].dashboard}><B1 lang="en" /></Shell>; }
