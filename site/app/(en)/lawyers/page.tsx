import Lawyers from '@/components/Lawyers';
import { Shell } from '@/components/Shell';
import { meta } from '@/lib/meta';
export const metadata = meta('en', 'Talk to an immigration lawyer in your city · CaseAlerta', 'Your choice: leave your city and email and a local immigration firm contacts you. No ads, no data selling.', '/lawyers/', '/abogados/');
export default function Page() { return <Shell lang="en" alt="/abogados/"><Lawyers lang="en" /></Shell>; }
