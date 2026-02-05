import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isBlocked, formatBlockTimeRemaining, getBlockTimeRemaining } from '@/lib/blockUtils';

interface UserFamilyRow {
  user_id: string;
  family_id: string;
  blocked_at?: string | null;
  blocked_until?: string | null;
  blocked_indefinite?: boolean;
  blocked_reason?: string | null;
  blocked_by?: string | null;
}

/**
 * Global hook that listens for when the current user is kicked from a family OR blocked.
 * Should be mounted once at the app level (in AppLayout).
 */
export function useKickedFromFamily() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const previousBlockState = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('global-membership-updates')
      // Listen for DELETE events (kicked or quit)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_families',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const removedFamilyId = (payload.old as UserFamilyRow)?.family_id;
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
      // Listen for UPDATE events (blocked/unblocked)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'user_families',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const newRow = payload.new as UserFamilyRow;
        const oldRow = payload.old as UserFamilyRow;
        
        if (!newRow?.family_id) return;

        // Create membership objects to check block status
        const newMembership = {
          userId: newRow.user_id,
          familyId: newRow.family_id,
          joinedAt: '',
          totalStars: 0,
          currentStage: 1,
          lastReadTimestamp: 0,
          seenCelebrations: [],
          blockedAt: newRow.blocked_at ?? undefined,
          blockedUntil: newRow.blocked_until ?? undefined,
          blockedIndefinite: newRow.blocked_indefinite ?? false,
          blockedReason: newRow.blocked_reason ?? undefined,
          blockedBy: newRow.blocked_by ?? undefined,
        };

        const oldMembership = {
          userId: oldRow.user_id,
          familyId: oldRow.family_id,
          joinedAt: '',
          totalStars: 0,
          currentStage: 1,
          lastReadTimestamp: 0,
          seenCelebrations: [],
          blockedAt: oldRow.blocked_at ?? undefined,
          blockedUntil: oldRow.blocked_until ?? undefined,
          blockedIndefinite: oldRow.blocked_indefinite ?? false,
          blockedReason: oldRow.blocked_reason ?? undefined,
          blockedBy: oldRow.blocked_by ?? undefined,
        };

        const wasBlocked = isBlocked(oldMembership);
        const nowBlocked = isBlocked(newMembership);

        console.log('[useKickedFromFamily] UPDATE event:', { 
          familyId: newRow.family_id, 
          wasBlocked, 
          nowBlocked,
          reason: newRow.blocked_reason 
        });

        // Get family name for notifications
        const { data: familyData } = await supabase
          .from('families')
          .select('name')
          .eq('id', newRow.family_id)
          .maybeSingle();

        const familyName = familyData?.name || t('family.title');

        if (!wasBlocked && nowBlocked) {
          // User was just blocked
          const remaining = getBlockTimeRemaining(newMembership);
          const timeStr = remaining === Infinity ? '' : formatBlockTimeRemaining(remaining);
          
          toast({
            title: newMembership.blockedIndefinite 
              ? t('block.youWereBlocked', { family: familyName })
              : t('block.youWereBlockedFor', { family: familyName, duration: timeStr }),
            description: newRow.blocked_reason 
              ? t(`block.reasons.${newRow.blocked_reason}`, { defaultValue: newRow.blocked_reason })
              : undefined,
            variant: "destructive",
          });

          // Dispatch event to refresh state
          window.dispatchEvent(new CustomEvent('family:updated'));
        } else if (wasBlocked && !nowBlocked) {
          // User was unblocked
          toast({
            title: t('block.youWereUnblocked', { family: familyName }),
          });

          // Dispatch event to refresh state
          window.dispatchEvent(new CustomEvent('family:updated'));
        }

        // Update the previous block state
        previousBlockState.current.set(newRow.family_id, nowBlocked);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.activeFamilyId, toast, navigate, updateUser, t]);
}
