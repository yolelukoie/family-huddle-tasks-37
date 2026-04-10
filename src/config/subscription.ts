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
let currentUserId: string | null = null;
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
  if (!isNative()) return;

  // Already configured for this user — nothing to do
  if (initialized && currentUserId === userId) return;

  // Already configured but for a different user — switch via logIn
  if (initialized && currentUserId !== userId) {
    await Purchases.logIn({ appUserID: userId });
    currentUserId = userId;
    return;
  }

  // First-time init
  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey: API_KEY, appUserID: userId });

  // Listen for real-time entitlement changes
  await Purchases.addCustomerInfoUpdateListener((info: CustomerInfo) => {
    notifyListeners(parseStatus(info));
  });

  initialized = true;
  currentUserId = userId;
}

export function resetRevenueCat(): void {
  initialized = false;
  currentUserId = null;
  listeners.clear();
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
    return {
      success: status.isActive,
      status,
      ...(!status.isActive && { error: 'Purchase completed but entitlement not activated. Try restoring purchases.' }),
    };
  } catch (e: any) {
    if (e?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: e?.message ?? 'Purchase failed' };
  }
}

// offerOptionId: the Google Play offer option id in the format "basePlanId:offerId" (e.g. "p1m:30")
// If provided, we purchase that specific offer via purchaseSubscriptionOption.
// If not provided, falls back to purchasePackage (default base plan price).
export async function purchasePromoOffering(offeringId: string, offerOptionId?: string): Promise<PurchaseResult> {
  if (!isNative() || !initialized) {
    return { success: false, error: 'Subscriptions are only available on Android' };
  }

  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.all[offeringId];
    if (!offering || offering.availablePackages.length === 0) {
      return { success: false, error: 'Promo offering not available' };
    }

    const pkg = offering.availablePackages[0];

    // If a specific offer option ID is provided, find it in the product's subscriptionOptions
    if (offerOptionId) {
      const subscriptionOption = pkg.product.subscriptionOptions?.find(
        (opt) => opt.id === offerOptionId,
      );
      if (subscriptionOption) {
        const { customerInfo } = await Purchases.purchaseSubscriptionOption({ subscriptionOption });
        const status = parseStatus(customerInfo);
        return { success: status.isActive, status };
      }
      // If the specific offer isn't found, fall through to base plan purchase
      console.warn(`[subscription] Offer option "${offerOptionId}" not found, falling back to base plan`);
    }

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
