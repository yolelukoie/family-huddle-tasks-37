import { Capacitor } from '@capacitor/core';
import { LOG_LEVEL, Purchases } from '@revenuecat/purchases-capacitor';

export interface SubscriptionStatus {
  isActive: boolean;
  expiresAt?: Date;
  plan: 'free' | 'premium';
  managementURL?: string;
}

const API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_API_KEY;

export const initializeRevenueCat = async (userId: string): Promise<void> => {
  if (Capacitor.getPlatform() !== 'android') return;

  await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
  await Purchases.configure({
    apiKey: API_KEY,
    appUserID: userId,
  });
};

export const checkSubscriptionStatus = async (): Promise<SubscriptionStatus> => {
  if (Capacitor.getPlatform() !== 'android') {
    return { isActive: false, plan: 'free' };
  }

  const { customerInfo } = await Purchases.getCustomerInfo();
  const premium = customerInfo.entitlements.active['premium'];

  if (premium) {
    return {
      isActive: true,
      plan: 'premium',
      expiresAt: premium.expirationDate ? new Date(premium.expirationDate) : undefined,
      managementURL: customerInfo.managementURL ?? undefined,
    };
  }

  return { isActive: false, plan: 'free' };
};

export const initiateSubscription = async (userId: string): Promise<boolean> => {
  if (Capacitor.getPlatform() !== 'android') {
    console.log('Subscriptions only supported on Android');
    return false;
  }

  await initializeRevenueCat(userId);

  const { current } = await Purchases.getOfferings();
  if (!current || current.availablePackages.length === 0) {
    console.error('No offerings available');
    return false;
  }

  const pkg = current.availablePackages[0];
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return !!customerInfo.entitlements.active['premium'];
};
