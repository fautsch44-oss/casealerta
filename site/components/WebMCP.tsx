'use client';
// WebMCP (navigator.modelContext): expone en el navegador las mismas herramientas del servidor MCP de CaseAlerta,
// para que un agente que navega la página (p. ej. Gemini en Chrome) las llame directo en vez de leer la pantalla.
// Una sola fuente de verdad: cada herramienta reenvía la llamada a /mcp/ con el protocolo vigente.
// La consulta de un recibo vive en el formulario (herramienta declarativa `consultar_recibo` en Lookup).
import { useEffect } from 'react';

const VERSION = '2026-07-28';
type Tool = { name: string; title?: string; description: string; inputSchema: object };
type ModelContext = { registerTool: (tool: object, opts?: { signal?: AbortSignal }) => unknown };

async function rpc(method: string, params: Record<string, unknown> = {}, name?: string) {
  const r = await fetch('/mcp/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': VERSION, 'Mcp-Method': method, ...(name ? { 'Mcp-Name': name } : {}) },
    body: JSON.stringify({
      jsonrpc: '2.0', id: Date.now(), method,
      params: { ...params, _meta: { 'io.modelcontextprotocol/protocolVersion': VERSION, 'io.modelcontextprotocol/clientCapabilities': {}, 'io.modelcontextprotocol/clientInfo': { name: 'casealerta-webmcp', version: '1.0.0' } } },
    }),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);
  return j.result;
}

export function WebMCP({ lang }: { lang: 'es' | 'en' }) {
  useEffect(() => {
    const mc = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!mc?.registerTool) return;
    const ctl = new AbortController();
    rpc('tools/list').then((res: { tools: Tool[] }) => {
      if (ctl.signal.aborted) return;
      for (const t of res.tools) {
        try {
          mc.registerTool({
            name: t.name,
            title: t.title,
            description: `${t.description} Default language on this page: "${lang}".`,
            inputSchema: t.inputSchema,
            annotations: { readOnlyHint: true },
            execute: async (args: Record<string, unknown>) => {
              const out = await rpc('tools/call', { name: t.name, arguments: { lang, ...(args ?? {}) } }, t.name);
              return (out.content ?? []).map((c: { text?: string }) => c.text ?? '').join('\n') || JSON.stringify(out.structuredContent ?? out);
            },
          }, { signal: ctl.signal });
        } catch { /* herramienta ya registrada o API distinta: se ignora */ }
      }
    }).catch(() => null);
    return () => ctl.abort();
  }, [lang]);
  return null;
}
