import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { PaywallOverlay } from './PaywallOverlay';
import { Settings, ExternalLink, RefreshCw, Loader2, Crown } from 'lucide-react';
import { useState } from 'react';
import { isPlatform } from '@/lib/platform';

export function SubscriptionStatusCard() {
  const { t } = useTranslation();
  const { status, isLoading, restore, isTrialActive, trialExpiresAt } = useSubscription();
  const { toast } = useToast();
  const [restoring, setRestoring] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

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
      return <Badge className="bg-[hsl(var(--family-star))] text-foreground">{t('subscription.status.lifetime')}</Badge>;
    }
    if (status.isTrialing) {
      const daysLeft = status.expiresAt
        ? Math.max(0, Math.ceil((status.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
        : 0;
      return <Badge className="bg-primary text-primary-foreground">{t('subscription.status.trial', { days: daysLeft })}</Badge>;
    }
    if (isTrialActive && trialExpiresAt) {
      const daysLeft = Math.max(0, Math.ceil((trialExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      return <Badge className="bg-primary text-primary-foreground">{t('subscription.status.trial', { days: daysLeft })}</Badge>;
    }
    if (status.isActive) {
      return <Badge className="bg-[hsl(var(--family-success))] text-primary-foreground">{t('subscription.status.premium')}</Badge>;
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
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {t('personal.subscription')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('subscription.statusLabel', 'Status')}</span>
            {getStatusBadge()}
          </div>
          {/* Status description */}
          {status.isLifetime && (
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Crown className="h-4 w-4 text-[hsl(var(--family-star))]" />
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

          {isTrialActive && trialExpiresAt && (
            <p className="text-sm text-muted-foreground">
              {t('subscription.trialEndsOn', { date: trialExpiresAt.toLocaleDateString() })}
            </p>
          )}

          {!status.isActive && !isTrialActive && (
            <p className="text-sm text-muted-foreground">{t('subscription.freeDesc')}</p>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {isPlatform('capacitor') && (
              <Button onClick={() => setPaywallOpen(true)} variant="outline" className="w-full">
                <Crown className="h-4 w-4 mr-2" />
                {t('personal.manageSubscription')}
              </Button>
            )}

            {status.isActive && !status.isLifetime && status.managementURL && (
              <Button onClick={handleManage} variant="outline" className="w-full">
                <ExternalLink className="h-4 w-4 mr-2" />
                {/* Generic label — RevenueCat's managementURL returns the correct
                    store URL per platform. Apple's review policy (2.3.10) forbids
                    mentioning competing platforms in the iOS binary, so we use
                    platform-agnostic copy. */}
                {t('subscription.manageInStore')}
              </Button>
            )}

            {isPlatform('capacitor') && (
              <Button onClick={handleRestore} variant="ghost" size="sm" className="w-full" disabled={restoring}>
                {restoring ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                {t('subscription.restore')}
              </Button>
            )}
          </div>

        </CardContent>
      </Card>

      <PaywallOverlay isExplicitOpen={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </>
  );
}
