import { Legal, legalTitle } from '@/components/Legal';
import { meta } from '@/lib/meta';
export const metadata = meta('es', `${legalTitle('terminos')} · CaseAlerta`, `${legalTitle('terminos')} — CaseAlerta (VARGER Group LLC)`, '/terminos/');
export default function Page() { return <Legal k="terminos" />; }
