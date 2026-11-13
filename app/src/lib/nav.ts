import { router, type Href } from 'expo-router';

/** Regresar siempre funciona: si no hay historial (la app retomó en esta pantalla), va a la pantalla anterior lógica. */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
