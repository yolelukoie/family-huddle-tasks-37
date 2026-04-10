import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { PromoCodeInput } from './PromoCodeInput';
import { Crown, RefreshCw, Loader2 } from 'lucide-react';
import { isPlatform } from '@/lib/platform';

export function PaywallOverlay() {
  const { t } = useTranslation();
  const { shouldShowPaywall, isLoading, purchase, restore } = useSubscription();
  const { toast } = useToast();
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const open = !dismissed && shouldShowPaywall && !isLoading;

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
    <Dialog open={open} modal={true} onOpenChange={(v) => { if (!v) setDismissed(true); }}>
      <DialogContent
        className="max-w-md text-center"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="pt-2 text-center space-y-4">
          <Crown className="h-12 w-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-semibold">{t('paywall.title')}</h2>
          <p className="text-sm text-muted-foreground">{t('paywall.description')}</p>

          {isPlatform('capacitor') && (
            <Button onClick={handleSubscribe} className="w-full" disabled={purchasing}>
              {purchasing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t('paywall.subscribe')}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            {t('subscription.disclosure')}
          </p>

          <PromoCodeInput alwaysOpen />

          {isPlatform('capacitor') && (
            <Button onClick={handleRestore} variant="ghost" size="sm" className="w-full" disabled={restoring}>
              {restoring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {t('subscription.restore')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
