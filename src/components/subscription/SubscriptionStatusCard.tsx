import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { PromoCodeInput } from './PromoCodeInput';
import { Settings, ExternalLink, RefreshCw, Loader2, Crown } from 'lucide-react';
import { useState } from 'react';
import { isPlatform } from '@/lib/platform';

export function SubscriptionStatusCard() {
  const { t } = useTranslation();
  const { status, isLoading, purchase, restore } = useSubscription();
  const { toast } = useToast();
  const [restoring, setRestoring] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const handleSubscribe = async () => {
    setPurchasing(true);
    try {
      const result = await purchase();
      if (result.success) {
        toast({ title: t('subscription.activated') });
      } else if (!result.cancelled && result.error) {
        toast({ title: t('subscription.purchaseFailed'), description: result.error, variant: 'destructive' });
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

  const handleManage = () => {
    if (status.managementURL) {
      window.open(status.managementURL, '_blank');
    }
  };

  // Status badge
  const getStatusBadge = () => {
    if (status.isLifetime) {
      return <Badge className="bg-amber-500 text-white">{t('subscription.status.lifetime')}</Badge>;
    }
    if (status.isTrialing) {
      const daysLeft = status.expiresAt
        ? Math.max(0, Math.ceil((status.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;
      return <Badge className="bg-blue-500 text-white">{t('subscription.status.trial', { days: daysLeft })}</Badge>;
    }
    if (status.isActive) {
      return <Badge className="bg-green-500 text-white">{t('subscription.status.premium')}</Badge>;
    }
    return <Badge variant="secondary">{t('subscription.status.free')}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('personal.subscription')}
          </span>
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status description */}
        {status.isLifetime && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Crown className="h-4 w-4 text-amber-500" />
            {t('subscription.lifetimeDesc')}
          </p>
        )}

        {status.isActive && !status.isLifetime && status.expiresAt && (
          <p className="text-sm text-muted-foreground">
            {t('subscription.renewsOn', {
              date: status.expiresAt.toLocaleDateString(),
            })}
          </p>
        )}

        {!status.isActive && (
          <p className="text-sm text-muted-foreground">{t('subscription.freeDesc')}</p>
        )}

        {/* Actions */}
        <div className="space-y-2">
          {!status.isActive && isPlatform('capacitor') && (
            <Button onClick={handleSubscribe} className="w-full" disabled={purchasing}>
              {purchasing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('subscription.subscribeNow')}
            </Button>
          )}

          {status.isActive && !status.isLifetime && status.managementURL && (
            <Button onClick={handleManage} variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              {t('subscription.manageOnGooglePlay')}
            </Button>
          )}

          {isPlatform('capacitor') && (
            <Button onClick={handleRestore} variant="ghost" size="sm" className="w-full" disabled={restoring}>
              {restoring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              {t('subscription.restore')}
            </Button>
          )}
        </div>

        {/* Promo code input */}
        {!status.isLifetime && <PromoCodeInput alwaysOpen={false} />}
      </CardContent>
    </Card>
  );
}
