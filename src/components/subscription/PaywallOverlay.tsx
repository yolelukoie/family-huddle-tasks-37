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
          <PromoCodeInput alwaysOpen />

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

          {isPlatform('capacitor') && (
            <Button onClick={handleSubscribe} className="w-full" disabled={purchasing}>
              {purchasing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('paywall.subscribe')}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            {t('subscription.disclosure')}
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
