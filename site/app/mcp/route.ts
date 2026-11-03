// Servidor MCP público de CaseAlerta en Next (respaldo). El principal corre en Cloudflare Workers (worker/);
// cuando MCP_WORKER_ORIGIN está definido, Vercel reenvía /mcp/ al Worker y esta ruta no se usa.
import { mcpDelete, mcpGet, mcpOptions, mcpPost } from '@/lib/mcp-http';
export const POST = mcpPost;
export const GET = mcpGet;
export const DELETE = mcpDelete;
export const OPTIONS = mcpOptions;
