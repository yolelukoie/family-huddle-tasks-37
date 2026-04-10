import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { isPlatform } from '@/lib/platform';
import {
  initRevenueCat,
  resetRevenueCat,
  getSubscriptionStatus,
  purchaseDefaultPackage,
  purchasePromoOffering,
  restorePurchases as restoreRC,
  addStatusListener,
  removeStatusListener,
  type SubscriptionStatus,
  type PurchaseResult,
} from '@/config/subscription';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIAL_DURATION_MS = 4 * 24 * 60 * 60 * 1000; // 4 days

// ---------------------------------------------------------------------------
// Context type
// ---------------------------------------------------------------------------

interface SubscriptionContextType {
  status: SubscriptionStatus;
  isPremium: boolean;
  isLoading: boolean;
  isTrialActive: boolean;
  trialExpiresAt: Date | null;
  isTrialExpired: boolean;
  shouldShowPaywall: boolean;
  purchase: () => Promise<PurchaseResult>;
  purchaseWithPromo: (offeringId: string, offerOptionId?: string) => Promise<PurchaseResult>;
  redeemLifetimeCode: (code: string) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<void>;
  refreshStatus: () => Promise<void>;
}

const DEFAULT_STATUS: SubscriptionStatus = {
  isActive: false,
  isTrialing: false,
  isLifetime: false,
  plan: 'free',
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState(true);

  // -- Trial computation --

  const trialExpiresAt = useMemo(() => {
    if (!user?.trialStartedAt) return null;
    return new Date(new Date(user.trialStartedAt).getTime() + TRIAL_DURATION_MS);
  }, [user?.trialStartedAt]);

  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!trialExpiresAt) return;
    const msUntilExpiry = trialExpiresAt.getTime() - Date.now();
    if (msUntilExpiry <= 0) return; // already expired
    const timer = setTimeout(() => forceRender((n) => n + 1), msUntilExpiry + 100);
    return () => clearTimeout(timer);
  }, [trialExpiresAt]);

  const isTrialExpired = trialExpiresAt ? Date.now() > trialExpiresAt.getTime() : false;
  const isTrialActive = trialExpiresAt ? !isTrialExpired : false;
  const isPremium = status.isActive;
  const shouldShowPaywall = isTrialExpired && !isPremium;

  // Initialize RevenueCat and fetch initial status
  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    if (!isPlatform('capacitor')) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const init = async () => {
      try {
        await initRevenueCat(user.id);
        const s = await getSubscriptionStatus();
        if (!cancelled) setStatus(s);
      } catch (err) {
        console.error('[Subscription] init error:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    init();

    // Listen for real-time changes from RevenueCat
    const listener = (s: SubscriptionStatus) => {
      if (!cancelled) setStatus(s);
    };
    addStatusListener(listener);

    return () => {
      cancelled = true;
      removeStatusListener(listener);
      setStatus(DEFAULT_STATUS);
    };
  }, [user?.id]);

  // -- Actions --

  const purchase = useCallback(async (): Promise<PurchaseResult> => {
    const result = await purchaseDefaultPackage();
    if (result.status) setStatus(result.status);
    return result;
  }, []);

  const purchaseWithPromo = useCallback(async (offeringId: string, offerOptionId?: string): Promise<PurchaseResult> => {
    const result = await purchasePromoOffering(offeringId, offerOptionId);
    if (result.status) setStatus(result.status);
    return result;
  }, []);

  const redeemLifetimeCode = useCallback(
    async (code: string): Promise<{ success: boolean; error?: string }> => {
      if (!user?.id) return { success: false, error: 'Not authenticated' };

      try {
        const { data, error } = await supabase.functions.invoke('redeem-promo-code', {
          body: { code, userId: user.id },
        });

        if (error) {
          // Try to extract the actual error body from the edge function response
          let detail = error.message ?? 'Redemption failed';
          try {
            const body = await (error as any).context?.json?.();
            if (body?.error) detail = body.error;
          } catch {}
          return { success: false, error: detail };
        }

        if (data?.error) {
          return { success: false, error: data.error };
        }

        // Trust the server response immediately — dismiss the paywall now
        setStatus({
          isActive: true,
          isTrialing: false,
          isLifetime: true,
          plan: 'premium',
        });

        // Also sync RevenueCat in the background (it may have a short delay)
        if (isPlatform('capacitor')) {
          restoreRC().then((s) => {
            if (s.isActive) setStatus(s);
          }).catch(() => {});
        }

        return { success: true };
      } catch (e: any) {
        return { success: false, error: e?.message ?? 'Redemption failed' };
      }
    },
    [user?.id],
  );

  const restore = useCallback(async () => {
    const s = await restoreRC();
    setStatus(s);
  }, []);

  const refreshStatus = useCallback(async () => {
    const s = await getSubscriptionStatus();
    setStatus(s);
  }, []);

  return (
    <SubscriptionContext.Provider
      value={{
        status,
        isPremium,
        isLoading,
        isTrialActive,
        trialExpiresAt,
        isTrialExpired,
        shouldShowPaywall,
        purchase,
        purchaseWithPromo,
        redeemLifetimeCode,
        restore,
        refreshStatus,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used inside <SubscriptionProvider>');
  }
  return ctx;
}
