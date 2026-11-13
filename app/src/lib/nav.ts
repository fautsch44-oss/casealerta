import { router, type Href } from 'expo-router';

/** Regresar siempre funciona: si no hay historial (la app retomó en esta pantalla), va a la pantalla anterior lógica. */
export function goBack(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/** Termina un recorrido: borra las pantallas de abajo (bienvenida, pasos) y deja Mis casos como base. */
export function goHome() {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/(tabs)/cases' as Href);
}
