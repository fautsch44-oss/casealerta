import { clientCatalog } from '@/lib/catalog';
export const dynamic = 'force-static';
export function GET() { return Response.json(clientCatalog('es')); }
