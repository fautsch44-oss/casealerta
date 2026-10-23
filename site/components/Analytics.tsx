'use client';
// Telemetría web (skill flujo-onboarding §6): proyecto PostHog compartido de VARGER, cada evento con app=casealerta.
// Nunca rompe la página: todo en try/catch.
import posthog from 'posthog-js';
import { useEffect } from 'react';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? 'phc_Af2D9LkVb3vTCHcdyKNa3gLdFbsAWfkpBHbPJVYrFh5t';
let started = false;

function start(lang: string) {
  if (started || typeof window === 'undefined') return;
  try {
    posthog.init(KEY, { api_host: 'https://us.i.posthog.com', capture_pageview: true, autocapture: true, persistence: 'localStorage+cookie' });
    posthog.register({ app: 'casealerta', platform: 'web', lang });
    started = true;
  } catch { /* la analítica nunca rompe la web */ }
}

export function track(event: string, props: Record<string, unknown> = {}) {
  try { if (started) posthog.capture(event, { app: 'casealerta', platform: 'web', ...props }); } catch {}
}

export function Analytics({ lang }: { lang: string }) {
  useEffect(() => { start(lang); }, [lang]);
  return null;
}
