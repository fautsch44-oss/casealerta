// Tarjeta del servidor MCP (SEP-2127, application/mcp-server-card+json): ubicación reservada <url-mcp>/server-card.
import { discoveryOptions, discoveryResponse } from '@/lib/discovery';
import { SERVER_CARD } from '@/lib/mcp';
export const GET = (req: Request) => discoveryResponse(req, SERVER_CARD, 'application/mcp-server-card+json');
export const OPTIONS = discoveryOptions;
