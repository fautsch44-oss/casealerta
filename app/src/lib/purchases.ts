// RevenueCat (org VARGERSOFT). Se configura UNA vez con una promesa compartida (whenReady) — skill flujo-onboarding §5.
// El éxito del cobro solo cuenta con entitlement activo; el paywall además escucha el listener (transferencia, compra diferida, restaurar).
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { ensureSession } from './supabase';

// Llaves PÚBLICAS del SDK de RevenueCat (proyecto CaseAlerta 60f1b981); no son secretos.
export const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? 'appl_ZMlGwbXDNoZDhIngiCtIwWKLdBM';
export const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? 'goog_lLEnFJNWFbqamziRrgWqQlBlTle';
export const ENTITLEMENT = 'pro';

let ready: Promise<boolean> | null = null;

/** Promesa compartida: todos (paywall, restaurar, ajustes) esperan la misma configuración. */
export function whenReady(): Promise<boolean> {
  if (ready) return ready;
  ready = (async () => {
    const key = Platform.OS === 'ios' ? IOS_KEY : Platform.OS === 'android' ? ANDROID_KEY : '';
    if (!key) return false;
    const session = await ensureSession();
    Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: key, appUserID: session.user.id });
    return true;
  })().catch(() => { ready = null; return false; });
  return ready;
}
/** Compatibilidad con llamadas existentes. */
export const configurePurchases = whenReady;

export type Plan = 'annual' | 'monthly' | 'family';

export async function getPackages(): Promise<Partial<Record<Plan, PurchasesPackage>>> {
  if (!(await whenReady())) return {};
  const offerings = await Purchases.getOfferings();
  const cur = offerings.current;
  if (!cur) return {};
  const byId = (id: string) => cur.availablePackages.find((p) => p.identifier === id || p.product.identifier === id);
  return {
    annual: cur.annual ?? byId('pro_annual'),
    monthly: cur.monthly ?? byId('pro_monthly'),
    family: byId('family_monthly'),
  };
}

export const isPro = (info: CustomerInfo) => !!info.entitlements.active[ENTITLEMENT];
export const isTrial = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT]?.periodType === 'TRIAL';

export async function purchase(pkg: PurchasesPackage): Promise<{ pro: boolean; trial: boolean }> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return { pro: isPro(customerInfo), trial: isTrial(customerInfo) };
}

export async function restore(): Promise<boolean> {
  if (!(await whenReady())) return false;
  const info = await Purchases.restorePurchases();
  return isPro(info);
}

/** Escucha cambios de entitlement; devuelve la función para dejar de escuchar. */
export function onProChange(cb: (pro: boolean) => void): () => void {
  let off = () => {};
  whenReady().then((ok) => {
    if (!ok) return;
    const l = (info: CustomerInfo) => cb(isPro(info));
    Purchases.addCustomerInfoUpdateListener(l);
    off = () => { try { Purchases.removeCustomerInfoUpdateListener(l); } catch {} };
  });
  return () => off();
}
