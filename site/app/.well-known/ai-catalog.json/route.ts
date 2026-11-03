// AI Catalog (application/ai-catalog+json): descubrimiento a nivel dominio de todo lo que casealerta.com ofrece a agentes.
import { discoveryOptions, discoveryResponse } from '@/lib/discovery';
import { AI_CATALOG } from '@/lib/mcp';
export const GET = (req: Request) => discoveryResponse(req, AI_CATALOG, 'application/ai-catalog+json');
export const OPTIONS = discoveryOptions;
