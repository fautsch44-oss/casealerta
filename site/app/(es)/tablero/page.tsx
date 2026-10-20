import B1 from '@/components/B1';
import { Shell } from '@/components/Shell';
import { meta } from '@/lib/meta';
import { P } from '@/lib/i18n';
export const metadata = { ...meta('es', "Tablero de peticiones para empleadores y despachos · CaseAlerta", "Todas las peticiones de tus trabajadores en un tablero, con semáforo y avisos al equipo. Prueba 14 días.", P['es'].dashboard, P['en'].dashboard), robots: { index: true, follow: true } };
export default function Page() { return <Shell lang="es" alt={P['en'].dashboard}><B1 lang="es" /></Shell>; }
