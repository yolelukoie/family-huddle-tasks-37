import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSubscription } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Tag, ChevronDown, ChevronUp } from 'lucide-react';

interface PromoCodeInputProps {
  /** When true the input is always visible (no collapsible toggle) */
  alwaysOpen?: boolean;
}

export function PromoCodeInput({ alwaysOpen = false }: PromoCodeInputProps) {
  const { t } = useTranslation();
  const { purchaseWithPromo, redeemLifetimeCode } = useSubscription();
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(alwaysOpen);

  const handleApply = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;

    setIsLoading(true);
    try {
      // Codes that map to a RevenueCat offering (Google Play billing flow)
      // Maps promo code → { offeringId, offerOptionId }
      // offerOptionId is "basePlanId:offerId" from Google Play (used to select a specific promotional offer)
      const OFFERING_CODES: Record<string, { offeringId: string; offerOptionId?: string }> = {
        '30FOR3':   { offeringId: '30',      offerOptionId: 'p1m:30' },
        'BETATESTER': { offeringId: 'testers', offerOptionId: 'p1m:testers' },
      };
      const offeringConfig = OFFERING_CODES[trimmed.toUpperCase()];
      if (offeringConfig) {
        const result = await purchaseWithPromo(offeringConfig.offeringId, offeringConfig.offerOptionId);
        if (result.success) {
          toast({ title: t('subscription.promo.success') });
          setCode('');
        } else if (!result.cancelled) {
          toast({
            title: t('subscription.promo.failed'),
            description: result.error,
            variant: 'destructive',
          });
        }
      } else {
        // Lifetime code — goes through edge function
        const result = await redeemLifetimeCode(trimmed);
        if (result.success) {
          toast({ title: t('subscription.promo.success') });
          setCode('');
        } else {
          toast({
            title: t('subscription.promo.invalid'),
            description: result.error,
            variant: 'destructive',
          });
        }
      }
    } catch {
      toast({
        title: t('subscription.promo.failed'),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!alwaysOpen && !isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <Tag className="h-3.5 w-3.5" />
        {t('subscription.promo.haveCode')}
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {!alwaysOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
        >
          <Tag className="h-3.5 w-3.5" />
          {t('subscription.promo.haveCode')}
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex gap-2">
        <Input
          placeholder={t('subscription.promo.placeholder')}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          disabled={isLoading}
          className="flex-1"
          style={{ textTransform: 'uppercase' }}
        />
        <Button
          onClick={handleApply}
          disabled={isLoading || !code.trim()}
          size="sm"
          variant="outline"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t('subscription.promo.apply')}
        </Button>
      </div>
    </div>
  );
}
