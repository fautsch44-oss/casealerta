// RevenueCat (org VARGERSOFT). Las compras dentro de la app van por Apple/Google; YUNQUE valida el recibo vía webhook → subscriptions.
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, type PurchasesPackage } from 'react-native-purchases';
import { ensureSession } from './supabase';

// Llaves PÚBLICAS del SDK de RevenueCat (proyecto CaseAlerta 60f1b981); no son secretos.
const IOS_KEY = process.env.EXPO_PUBLIC_RC_IOS_KEY ?? 'appl_ZMlGwbXDNoZDhIngiCtIwWKLdBM';
const ANDROID_KEY = process.env.EXPO_PUBLIC_RC_ANDROID_KEY ?? 'goog_lLEnFJNWFbqamziRrgWqQlBlTle';
export const ENTITLEMENT = 'pro';

let configured = false;
export async function configurePurchases() {
  const key = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  if (!key || configured) return configured;
  const session = await ensureSession();
  Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: key, appUserID: session.user.id });
  configured = true;
  return true;
}

export type Plan = 'annual' | 'monthly' | 'family';

export async function getPackages(): Promise<Partial<Record<Plan, PurchasesPackage>>> {
  if (!(await configurePurchases())) return {};
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

export async function purchase(pkg: PurchasesPackage): Promise<boolean> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return !!customerInfo.entitlements.active[ENTITLEMENT];
}

export async function restore(): Promise<boolean> {
  if (!(await configurePurchases())) return false;
  const info = await Purchases.restorePurchases();
  return !!info.entitlements.active[ENTITLEMENT];
}
