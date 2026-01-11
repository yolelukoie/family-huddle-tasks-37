import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

/**
 * Global hook that listens for when the current user is kicked from a family.
 * Should be mounted once at the app level (in AppLayout).
 */
export function useKickedFromFamily() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('global-kicked-from-family')
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_families',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const removedFamilyId = (payload.old as any)?.family_id;
        if (!removedFamilyId) return;

        console.log('[useKickedFromFamily] User removed from family:', removedFamilyId);

        // Get the removed family name for notification
        const { data: familyData } = await supabase
          .from('families')
          .select('name')
          .eq('id', removedFamilyId)
          .maybeSingle();

        const familyName = familyData?.name || t('family.title');

        // Check remaining families from database (source of truth)
        const { data: remainingFamilies } = await supabase
          .from('user_families')
          .select('family_id')
          .eq('user_id', user.id);

        // Show notification
        toast({
          title: t('family.removedFromFamily'),
          description: `${t('family.removedFromFamilyDesc')} "${familyName}".`,
          variant: "destructive",
        });

        if (!remainingFamilies || remainingFamilies.length === 0) {
          // No families left - update profile and redirect to onboarding
          console.log('[useKickedFromFamily] No families left, redirecting to onboarding');
          
          await supabase
            .from('profiles')
            .update({ active_family_id: null })
            .eq('id', user.id);

          await updateUser({ activeFamilyId: undefined });
          navigate('/onboarding', { replace: true });
        } else if (user.activeFamilyId === removedFamilyId) {
          // Was active in the kicked family - switch to another
          const nextFamilyId = remainingFamilies[0].family_id;
          console.log('[useKickedFromFamily] Switching to family:', nextFamilyId);

          await supabase
            .from('profiles')
            .update({ active_family_id: nextFamilyId })
            .eq('id', user.id);

          await updateUser({ activeFamilyId: nextFamilyId });
          
          // Force reload to refresh all data
          window.location.reload();
        } else {
          // Kicked from a non-active family - just reload to refresh the list
          console.log('[useKickedFromFamily] Kicked from non-active family, reloading');
          window.location.reload();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.activeFamilyId, toast, navigate, updateUser, t]);
}
