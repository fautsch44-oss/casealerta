import { Legal, legalTitle } from '@/components/Legal';
import { meta } from '@/lib/meta';
export const metadata = meta('en', `${legalTitle('terms')} · CaseAlerta`, `${legalTitle('terms')} — CaseAlerta (VARGER Group LLC)`, '/terms/');
export default function Page() { return <Legal k="terms" />; }
