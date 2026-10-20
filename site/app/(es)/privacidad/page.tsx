import { Legal, legalTitle } from '@/components/Legal';
import { meta } from '@/lib/meta';
export const metadata = meta('es', `${legalTitle('privacidad')} · CaseAlerta`, `${legalTitle('privacidad')} — CaseAlerta (VARGER Group LLC)`, '/privacidad/');
export default function Page() { return <Legal k="privacidad" />; }
