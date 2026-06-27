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
  if (!Capacitor.isNativePlatform()) return;

  // Already configured for this user — nothing to do
  if (initialized && currentUserId === userId) return;

  // Already configured but for a different user — switch via logIn
  if (initialized && currentUserId !== userId) {
    try {
      await Purchases.logIn({ appUserID: userId });
      currentUserId = userId;
    } catch (err) {
      console.error('[RevenueCat] logIn error:', err);
    }
    return;
  }

  // First-time init — pick the correct API key for this platform
  const platform = Capacitor.getPlatform();
  const apiKey = platform === 'ios'
    ? (import.meta.env.VITE_REVENUECAT_IOS_API_KEY as string)
    : (import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY as string);
  if (!apiKey) {
    console.warn(`[RevenueCat] No API key for platform: ${platform}`);
    return;
  }

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({ apiKey, appUserID: userId });

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
  if (!Capacitor.isNativePlatform() || !initialized) return { ...DEFAULT_STATUS };

  const { customerInfo } = await Purchases.getCustomerInfo();
  return parseStatus(customerInfo);
}

/**
 * Returns the localized price string for the default (current) subscription
 * offering, as provided by StoreKit / Google Play via RevenueCat.
 *
 * Required by Apple Guideline 2.1(b): the in-app price shown to the user
 * must match the price the store will actually charge in their region
 * (currency, formatting, taxes). Hardcoded "$4.90/month" is a guaranteed
 * rejection in any non-US region.
 *
 * Returns null on non-native platforms or when offerings are unavailable;
 * callers must provide a sensible fallback string in that case.
 */
export async function getDefaultPackagePriceString(): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || !initialized) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const offering = offerings.current;
    if (!offering || offering.availablePackages.length === 0) return null;
    const pkg = offering.availablePackages[0];
    // RevenueCat exposes the localized price string (e.g. "$4.90", "€4,49",
    // "¥600") on the underlying store product.
    return pkg.product.priceString ?? null;
  } catch (err) {
    console.warn('[RevenueCat] getDefaultPackagePriceString error:', err);
    return null;
  }
}

export async function purchaseDefaultPackage(): Promise<PurchaseResult> {
  if (!Capacitor.isNativePlatform() || !initialized) {
    return { success: false, error: 'Subscriptions are only available on mobile' };
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
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    console.error('[RevenueCat] purchaseDefaultPackage error:', err);
    if (err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: err?.message ?? 'Purchase failed' };
  }
}

// offerOptionId: store-specific offer option id in the format "basePlanId:offerId" (e.g. "p1m:30")
// If provided, we purchase that specific offer via purchaseSubscriptionOption.
// If not provided, falls back to purchasePackage (default base plan price).
export async function purchasePromoOffering(offeringId: string, offerOptionId?: string): Promise<PurchaseResult> {
  if (!Capacitor.isNativePlatform() || !initialized) {
    return { success: false, error: 'Subscriptions are only available on mobile' };
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
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    if (err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return { success: false, cancelled: true };
    }
    return { success: false, error: err?.message ?? 'Purchase failed' };
  }
}

export async function restorePurchases(): Promise<SubscriptionStatus> {
  if (!Capacitor.isNativePlatform() || !initialized) return { ...DEFAULT_STATUS };

  const { customerInfo } = await Purchases.restorePurchases();
  return parseStatus(customerInfo);
}

export async function getManagementURL(): Promise<string | null> {
  if (!Capacitor.isNativePlatform() || !initialized) return null;

  const { customerInfo } = await Purchases.getCustomerInfo();
  return customerInfo.managementURL ?? null;
}

export function addStatusListener(cb: StatusListener) {
  listeners.add(cb);
}

export function removeStatusListener(cb: StatusListener) {
  listeners.delete(cb);
}
