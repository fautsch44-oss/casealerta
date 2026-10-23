// Telemetría del embudo (skill flujo-onboarding §6). Proyecto PostHog compartido de VARGER; cada evento lleva app=casealerta.
// La analítica nunca rompe la app: todo va en try/catch y en web (preview sin almacenamiento nativo) no se inicia.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Llave PÚBLICA de ingesta (phc_), no es secreto.
export const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY ?? 'phc_Af2D9LkVb3vTCHcdyKNa3gLdFbsAWfkpBHbPJVYrFh5t';
export const POSTHOG_HOST = 'https://us.i.posthog.com';
export const APP_SLUG = 'casealerta';

type Props = Record<string, string | number | boolean | null | undefined>;
let client: any = null;
let starting: Promise<any> | null = null;

function base(): Props {
  return { app: APP_SLUG, app_version: Constants.expoConfig?.version ?? '1.0.0', platform: Platform.OS };
}

export function initAnalytics() {
  if (starting) return starting;
  starting = (async () => {
    try {
      if (Platform.OS === 'web' || !POSTHOG_KEY) return null;
      const { PostHog } = await import('posthog-react-native');
      client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST, captureAppLifecycleEvents: true });
      client.register(base());
      return client;
    } catch { client = null; return null; }
  })();
  return starting;
}

export function track(event: string, props: Props = {}) {
  try {
    const p = { ...base(), ...props };
    if (client) client.capture(event, p);
    else initAnalytics().then((c) => { try { c?.capture(event, p); } catch {} });
  } catch {}
}

export function identify(id: string) {
  try { initAnalytics().then((c) => { try { c?.identify(id, { app: APP_SLUG }); } catch {} }); } catch {}
}
