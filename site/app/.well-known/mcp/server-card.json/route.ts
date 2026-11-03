// Alias de la tarjeta MCP en la ruta .well-known que usan algunos clientes y rastreadores (propuesta SEP-1649).
import { discoveryOptions, discoveryResponse } from '@/lib/discovery';
import { SERVER_CARD } from '@/lib/mcp';
export const GET = (req: Request) => discoveryResponse(req, SERVER_CARD, 'application/json');
export const OPTIONS = discoveryOptions;
