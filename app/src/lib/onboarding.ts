// Máquina de estados del onboarding (skill flujo-onboarding §3). Módulo puro: sin React ni almacenamiento, probado en tests/.
// INITIAL(intro de valor) → PROFILE(idioma) → FIRST_VALUE(recibo + estatus explicado) → COMPROMISO(alertas) → PAYWALL → CASA
export const STEPS = ['intro', 'language', 'receipt', 'alerts'] as const;
export type Step = (typeof STEPS)[number];

export const ROUTE: Record<Step, string> = {
  intro: '/onboarding/intro',
  language: '/onboarding/language',
  receipt: '/onboarding/receipt',
  alerts: '/onboarding/alerts',
};

export const STEP_KEY = 'casealerta.obStep';

export function isStep(v: unknown): v is Step {
  return typeof v === 'string' && (STEPS as readonly string[]).includes(v);
}

/** Siguiente paso; null = terminó el onboarding (sigue casa + paywall). */
export function next(s: Step): Step | null {
  const i = STEPS.indexOf(s);
  return i < STEPS.length - 1 ? STEPS[i + 1] : null;
}

export function prev(s: Step): Step | null {
  const i = STEPS.indexOf(s);
  return i > 0 ? STEPS[i - 1] : null;
}

/**
 * Dónde reanudar al abrir la app. Un paso guardado que ya no existe cae en el primero vigente.
 * 'alerts' necesita un caso guardado; sin caso, se reanuda en 'receipt' (nunca se salta el primer valor).
 */
export function resume(saved: string | null | undefined, hasCase: boolean): Step {
  if (!isStep(saved)) return 'intro';
  if (saved === 'alerts' && !hasCase) return 'receipt';
  return saved;
}

/** "Saltar" en la intro nunca brinca el primer valor: lleva al idioma/recibo, no a la casa ni al paywall. */
export function skipTarget(from: Step): Step {
  return from === 'intro' ? 'language' : from === 'language' ? 'receipt' : from;
}

/** Paso en número humano: "Paso 2 de 4". */
export function stepNumber(s: Step) {
  return { n: STEPS.indexOf(s) + 1, total: STEPS.length };
}
