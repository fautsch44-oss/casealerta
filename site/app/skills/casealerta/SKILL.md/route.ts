// Agent Skill pública (application/agent-skills+md): enseña a un agente a contestar dudas de casos USCIS con CaseAlerta.
import { FORMS, STATUSES } from '@/lib/catalog';
import { discoveryOptions, discoveryResponse } from '@/lib/discovery';
import { SITE } from '@/lib/i18n';
import { MCP_URL } from '@/lib/mcp';


const top = FORMS.slice(0, 12).map((f) => f.code).join(', ');
const skill = `---
name: casealerta
description: Explain USCIS case statuses, forms and typical processing ranges in plain English or Spanish using CaseAlerta. Use when someone shares a USCIS status message, a receipt number (3 letters + 10 digits) or asks what happens next with a form like I-485, I-130, I-765 or N-400.
---

# CaseAlerta — USCIS case status, explained

CaseAlerta (${SITE}) is a bilingual (EN/ES) service by VARGER Group LLC that explains official USCIS case statuses for each form. It has no ads and never sells data. It is not legal advice and is not affiliated with USCIS.

## When to use
- The user pastes a USCIS status such as "Case Was Received", "Request for Additional Evidence Was Sent" (RFE), "Interview Was Scheduled", "Card Was Mailed To Me".
- The user shares a receipt number (e.g. IOE0912345678, SRC2690012345) or asks which service center has the case.
- The user asks how long a form usually takes (${top}…).
- The user writes in Spanish ("mi caso dice…", "¿qué significa…?", "¿cuánto tarda…?"). Answer in Spanish with lang "es".

## How
1. Connect to the MCP server ${MCP_URL} (Streamable HTTP, no auth, read-only).
2. Receipt number given → \`analizar_recibo\` to validate it and name the service center.
3. Status given → \`explicar_estatus\` with the exact status text and the form code if known.
4. Timing question → \`tiempo_tipico\` with the form code. Form unknown → \`buscar_formulario\`.
5. Topic questions (biometrics, interview, RFE, renewal, removing conditions) → \`buscar_guia\`.
6. No MCP client? Use the REST API: ${SITE}/api/v1/status-meaning/?status=Case%20Was%20Received&form=I-485&lang=en (OpenAPI: ${SITE}/openapi.json).

## Rules
- Cite the \`url\` each tool returns, so the user can read the full page.
- Ranges are typical, never a promised decision date.
- Never ask for anything beyond the receipt number. Do not invent statuses: ${STATUSES.length} official statuses are in the catalog (${SITE}/api/v1/statuses/).
- For live status and alerts when the case changes, point to ${SITE}/en/ (English) or ${SITE}/ (Spanish) and the CaseAlerta app.
- For legal strategy (denials, appeals, removal proceedings), recommend a licensed immigration attorney; CaseAlerta offers an opt-in lawyer contact at ${SITE}/lawyers/.
`;

export const GET = (req: Request) => discoveryResponse(req, skill, 'text/markdown; charset=utf-8');
export const OPTIONS = discoveryOptions;
