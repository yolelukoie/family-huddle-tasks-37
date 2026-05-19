import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent } from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { PromoCodeInput } from './PromoCodeInput';
import { Crown, RefreshCw, Loader2 } from 'lucide-react';
import { isPlatform } from '@/lib/platform';

interface PaywallOverlayProps {
  /** Controlled mode: external open state. When provided, paywall uses this instead of auto-gating. */
  isExplicitOpen?: boolean;
  /** Controlled mode: callback when user dismisses the dialog. */
  onClose?: () => void;
}

export function PaywallOverlay({ isExplicitOpen, onClose }: PaywallOverlayProps = {}) {
  const { t } = useTranslation();
  const { shouldShowPaywall, isLoading, purchase, restore, status } = useSubscription();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const isControlled = isExplicitOpen !== undefined;
  const open = isControlled
    ? isExplicitOpen
    : (!dismissed && shouldShowPaywall && !isLoading);

  const handleSubscribe = async () => {
    setPurchasing(true);
    try {
      const result = await purchase();
      if (result.success) {
        toast({ title: t('subscription.activated') });
      } else if (!result.cancelled) {
        toast({
          title: t('subscription.purchaseFailed'),
          description: result.error || t('subscription.purchaseFailedGeneric', 'Please try again or contact support.'),
          variant: 'destructive',
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restore();
      toast({ title: t('subscription.restoreSuccess') });
    } catch {
      toast({ title: t('subscription.restoreFailed'), variant: 'destructive' });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Dialog
      open={open}
      modal={true}
      onOpenChange={(v) => {
        if (!v) {
          if (isControlled && onClose) {
            onClose();
          } else {
            setDismissed(true);
          }
        }
      }}
    >
      <DialogContent
        className="max-w-md text-center"
        onInteractOutside={(e) => { if (!isControlled) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!isControlled) e.preventDefault(); }}
      >
        <DialogBody>
        <div className="pt-2 text-center space-y-4">
          {/* Promo code redemption is Android-only. Apple's App Store policy (3.1.1)
              forbids non-IAP unlock mechanisms; on iOS we hide this UI entirely. */}
          {!isPlatform('ios') && <PromoCodeInput alwaysOpen />}

          {isControlled && status.isActive && (
            <div className="rounded-lg bg-muted p-3 text-sm text-center">
              {status.isLifetime && (
                <p className="font-medium">{t('paywall.currentPlan.lifetime')}</p>
              )}
              {status.isActive && !status.isLifetime && status.isTrialing && status.expiresAt && (
                <p className="font-medium">{t('paywall.currentPlan.trial', { date: status.expiresAt.toLocaleDateString() })}</p>
              )}
              {status.isActive && !status.isLifetime && !status.isTrialing && status.expiresAt && (
                <p className="font-medium">{t('paywall.currentPlan.premium', { date: status.expiresAt.toLocaleDateString() })}</p>
              )}
            </div>
          )}

          <Crown className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-semibold">
            {isControlled ? t('paywall.titleManage') : t('paywall.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isControlled ? t('paywall.descriptionManage') : t('paywall.description')}
          </p>

          {/* Prominent trial terms block — required by Apple's 3.1.2(c).
              Apple's reviewer must see (in non-fine-print text) the trial
              duration, post-trial price, and auto-renewal language BEFORE
              tapping the Subscribe button. */}
          {isPlatform('capacitor') && (
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
              <p className="text-2xl font-bold leading-tight">
                {t('paywall.trialHeadline')}
              </p>
              <p className="text-base text-foreground">
                {t('paywall.trialSubheadline')}
              </p>
            </div>
          )}

          {isPlatform('capacitor') && (
            <Button onClick={handleSubscribe} className="w-full" disabled={purchasing}>
              {purchasing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('paywall.startTrialButton')}
            </Button>
          )}

          {/* Full disclosure — Apple HIG: must mention auto-renewal AND how
              to cancel. Upgraded from text-xs to text-sm so it isn't perceived
              as hidden fine print. */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('paywall.disclosureFull')}
          </p>

          {isPlatform('capacitor') && (
            <Button onClick={handleRestore} variant="ghost" size="sm" className="w-full" disabled={restoring}>
              {restoring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {t('subscription.restore')}
            </Button>
          )}
        </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
