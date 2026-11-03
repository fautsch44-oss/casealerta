// Catálogo MCP en la ruta .well-known/mcp/catalog.json (variante del grupo de Server Cards); mismo contenido que el AI Catalog.
import { discoveryOptions, discoveryResponse } from '@/lib/discovery';
import { AI_CATALOG } from '@/lib/mcp';
export const GET = (req: Request) => discoveryResponse(req, { specVersion: AI_CATALOG.specVersion, entries: AI_CATALOG.entries.filter((e) => e.type === 'application/mcp-server-card+json') }, 'application/json');
export const OPTIONS = discoveryOptions;
