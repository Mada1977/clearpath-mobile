import { Platform } from 'react-native';

export const ENTITLEMENT = 'premium';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

// Lazy-load the native module so the web bundle never touches it
function getRC() {
  if (!isNative) return null;
  try {
    return require('react-native-purchases');
  } catch {
    return null;
  }
}

const RC = getRC();
const Purchases: any = RC?.default ?? RC?.Purchases ?? null;

export function configurePurchases(userId: string): void {
  if (!Purchases) return;
  // Single shared key takes priority; platform-specific keys are the fallback
  const key =
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ??
    (Platform.OS === 'ios'
      ? (process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '')
      : (process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? ''));
  if (!key) return;
  // test_ keys are sandbox-only — RC crashes in release builds when it sees one.
  // Skip initialization so the app runs in a no-premium state during preview testing.
  if (key.startsWith('test_') && !__DEV__) {
    console.warn('[RC] Skipping: test_ key is not valid in a release build. Replace with a production key for full IAP support.');
    return;
  }
  try {
    Purchases.setLogLevel(RC.LOG_LEVEL?.ERROR ?? 4);
    Purchases.configure({ apiKey: key, appUserID: userId });
  } catch (e) {
    console.warn('[RC] configure error', e);
  }
}

export async function getOfferings(): Promise<any | null> {
  if (!Purchases) return null;
  try {
    const o = await Purchases.getOfferings();
    return o.current ?? null;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<any> {
  if (!Purchases) throw new Error('In-app purchases are not available on web.');
  const result = await Purchases.purchasePackage(pkg);
  return result.customerInfo;
}

export async function restorePurchases(): Promise<any> {
  if (!Purchases) throw new Error('In-app purchases are not available on web.');
  return Purchases.restorePurchases();
}

export async function getCustomerInfo(): Promise<any | null> {
  if (!Purchases) return null;
  try {
    return await Purchases.getCustomerInfo();
  } catch {
    return null;
  }
}

export function addCustomerInfoListener(fn: (info: any) => void): (() => void) | null {
  if (!Purchases) return null;
  Purchases.addCustomerInfoUpdateListener(fn);
  return () => {
    try { Purchases.removeCustomerInfoUpdateListener(fn); } catch {}
  };
}

export function isEntitled(info: any): boolean {
  return !!info?.entitlements?.active?.[ENTITLEMENT];
}

// RevenueCat sets userCancelled = true when the user dismisses the payment sheet
export function isCancelledError(err: any): boolean {
  return err?.userCancelled === true;
}
