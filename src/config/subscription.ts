import { Capacitor } from '@capacitor/core';
import { LOG_LEVEL, Purchases, PURCHASES_ERROR_CODE } from '@revenuecat/purchases-capacitor';
import type { CustomerInfo, PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionStatus {
  isActive: boolean;
  isTrialing: boolean;
  isLifetime: boolean;
  plan: 'free' | 'premium';
  expiresAt?: Date;
  managementURL?: string;
}

export interface PurchaseResult {
  success: boolean;
  cancelled?: boolean;
  error?: string;
  status?: SubscriptionStatus;
}

type StatusListener = (status: SubscriptionStatus) => void;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ENTITLEMENT_ID = 'Family Huddle Pro';
const API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY as string;
const DEFAULT_STATUS: SubscriptionStatus = {
  isActive: false,
  isTrialing: false,
  isLifetime: false,
  plan: 'free',
};

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

let initialized = false;
const listeners: Set<StatusListener> = new Set();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const isNative = () => Capacitor.getPlatform() === 'android';

function parseStatus(info: CustomerInfo): SubscriptionStatus {
  const ent = info.entitlements.active[ENTITLEMENT_ID];
  if (!ent) return { ...DEFAULT_STATUS };

  const isLifetime = !ent.expirationDate;
  const isTrialing = ent.periodType === 'TRIAL';

  return {
    isActive: true,
    isTrialing,
    isLifetime,
    plan: 'premium',
    expiresAt: ent.expirationDate ? new Date(ent.expirationDate) : undefined,
    managementURL: info.managementURL ?? undefined,
  };
}

function notifyListeners(status: SubscriptionStatus) {
  listeners.forEach((cb) => cb(status));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function initRevenueCat(userId: string): Promise<void> {
  if (!isNative() || initialized) return;

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey: API_KEY, appUserID: userId });

  // Listen for real-time entitlement changes
  await Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
    notifyListeners(parseStatus(info));
  });

  initialized = true;
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  if (!isNative() || !initialized) return { ...DEFAULT_STATUS };

  const { customerInfo } = await Purchases.getCustomerInfo();
  return parseStatus(customerInfo);
}

export async function purchaseDefaultPackage(): Promise<PurchaseResult> {
  if (!isNative() || !initialized) {
    return { success: false, error: 'Subscriptions are only available on Android' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering || offering.availablePackages.length === 0) {
      return { success: false, error: 'No offerings available' };
    }

    const pkg = offering.availablePackages[0];
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const status = parseStatus(customerInfo);
    return { success: status.isActive, status };
  } catch (e: any) {
    if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

export async function purchasePromoOffering(): Promise<PurchaseResult> {
  if (!isNative() || !initialized) {
    return { success: false, error: 'Subscriptions are only available on Android' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all['30'];
    if (!offering || offering.availablePackages.length === 0) {
      return { success: false, error: 'Promo offering not available' };
    }

    const pkg = offering.availablePackages[0];
    const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
    const status = parseStatus(customerInfo);
    return { success: status.isActive, status };
  } catch (e: any) {
    if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

export async function restorePurchases(): Promise<SubscriptionStatus> {
  if (!isNative() || !initialized) return { ...DEFAULT_STATUS };

  const { customerInfo } = await Purchases.restorePurchases();
  return parseStatus(customerInfo);
}

export async function getManagementURL(): Promise<string | null> {
  if (!isNative() || !initialized) return null;

  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo.managementURL ?? null;
}

export function addStatusListener(cb: StatusListener) {
  listeners.add(cb);
}

export function removeStatusListener(cb: StatusListener) {
  listeners.delete(cb);
}
