import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from './useSubscription';
import { useToast } from './use-toast';
import { ToastAction } from '@/components/ui/toast';
import { ROUTES } from '@/lib/constants';

export function useFeatureGate() {
  const { isPremium, isTrialActive } = useSubscription();
  const { toast } = useToast();
  const navigate = useNavigate();

  const canUse = isPremium || isTrialActive;

  const gate = useCallback(
    (action: () => void): void => {
      if (canUse) {
        action();
        return;
      }
      toast({
        title: 'Premium feature',
        description: 'Subscribe to unlock this feature.',
        action: (
          <ToastAction altText="Upgrade" onClick={() => navigate(ROUTES.personal)}>
            Upgrade
          </ToastAction>
        ),
      });
    },
    [canUse, toast, navigate],
  );

  const gateAsync = useCallback(
    async <T,>(action: () => Promise<T>): Promise<T | null> => {
      if (canUse) return action();
      toast({
        title: 'Premium feature',
        description: 'Subscribe to unlock this feature.',
        action: (
          <ToastAction altText="Upgrade" onClick={() => navigate(ROUTES.personal)}>
            Upgrade
          </ToastAction>
        ),
      });
      return null;
    },
    [canUse, toast, navigate],
  );

  return { canUse, gate, gateAsync };
}
