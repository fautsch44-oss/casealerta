import { Legal, legalTitle } from '@/components/Legal';
import { meta } from '@/lib/meta';
export const metadata = meta('en', `${legalTitle('privacy')} · CaseAlerta`, `${legalTitle('privacy')} — CaseAlerta (VARGER Group LLC)`, '/privacy/');
export default function Page() { return <Legal k="privacy" />; }
