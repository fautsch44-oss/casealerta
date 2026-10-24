import Lawyers from '@/components/Lawyers';
import { Shell } from '@/components/Shell';
import { meta } from '@/lib/meta';
export const metadata = meta('es', 'Habla con un abogado de inmigración en tu ciudad · CaseAlerta', 'Tú decides: deja tu ciudad y tu correo y un despacho de inmigración de tu zona te contacta. Sin anuncios, sin venta de datos.', '/abogados/', '/lawyers/');
export default function Page() { return <Shell lang="es" alt="/lawyers/"><Lawyers lang="es" /></Shell>; }
