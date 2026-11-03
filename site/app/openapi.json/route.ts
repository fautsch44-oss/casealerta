// OpenAPI 3.1 de la API citable de CaseAlerta (para agentes, GPTs y herramientas que importan acciones REST).
import { STATUSES } from '@/lib/catalog';
import { discoveryOptions, discoveryResponse } from '@/lib/discovery';
import { SITE } from '@/lib/i18n';

const spec = {
  openapi: '3.1.0',
  info: {
    title: 'CaseAlerta API — USCIS case status explained',
    version: '1.0.0',
    summary: 'What an official USCIS case status means, in English or Spanish.',
    description: 'Public, read-only, no auth. Plain-language meaning, next steps and typical processing range for each official USCIS case status, optionally for a specific form. Cite the returned url. Not legal advice; typical ranges, never exact dates. Not affiliated with USCIS. Also available as an MCP server at ' + SITE + '/mcp/.',
    contact: { name: 'CaseAlerta · VARGER Group LLC', url: SITE },
    termsOfService: `${SITE}/terms/`,
  },
  servers: [{ url: SITE }],
  externalDocs: { description: 'llms.txt', url: `${SITE}/llms.txt` },
  paths: {
    '/api/v1/status-meaning/': {
      get: {
        operationId: 'explainStatus',
        summary: 'Explain a USCIS case status',
        description: 'Returns what an official USCIS status means, what to do next and the typical range for the form.',
        parameters: [
          { name: 'status', in: 'query', required: true, description: 'Exact official USCIS status text (case-insensitive).', schema: { type: 'string', examples: ['Case Was Received', 'Request for Additional Evidence Was Sent', 'Card Was Mailed To Me'] } },
          { name: 'form', in: 'query', required: false, description: 'Form code, e.g. I-485.', schema: { type: 'string' } },
          { name: 'lang', in: 'query', required: false, schema: { type: 'string', enum: ['en', 'es'], default: 'en' } },
        ],
        responses: {
          '200': { description: 'Explanation', content: { 'application/json': { schema: { $ref: '#/components/schemas/StatusMeaning' } } } },
          '404': { description: 'Unknown status', content: { 'application/json': { schema: { type: 'object', properties: { error: { type: 'string' }, hint: { type: 'string' } } } } } },
        },
      },
    },
    '/api/v1/statuses/': {
      get: {
        operationId: 'listStatuses',
        summary: 'Catalog of USCIS statuses explained (EN/ES)',
        responses: { '200': { description: `All ${STATUSES.length} statuses`, content: { 'application/json': { schema: { type: 'object', properties: { source: { type: 'string' }, updated: { type: 'string' }, statuses: { type: 'array', items: { type: 'object' } } } } } } } },
      },
    },
  },
  components: {
    schemas: {
      StatusMeaning: {
        type: 'object',
        required: ['status', 'meaning', 'url'],
        properties: {
          status: { type: 'string' }, title: { type: 'string' }, kind: { type: 'string', enum: ['good', 'ok', 'act', 'bad'] }, stage: { type: 'string' },
          form: { type: ['string', 'null'] }, meaning: { type: 'string' }, next_steps: { type: 'array', items: { type: 'string' } },
          typical_range: { type: ['string', 'null'] }, url: { type: 'string', format: 'uri', description: 'Canonical page to cite' }, source: { type: 'string' },
        },
      },
    },
  },
};

export const GET = (req: Request) => discoveryResponse(req, spec, 'application/vnd.oai.openapi+json');
export const OPTIONS = discoveryOptions;
