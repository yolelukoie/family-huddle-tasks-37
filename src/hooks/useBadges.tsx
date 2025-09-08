import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useApp } from './useApp';
import { getCurrentStageBadges, getNewlyUnlockedBadges, shouldShowBadges } from '@/lib/badges';
import { supabase } from '@/integrations/supabase/client';
import { useCelebrations } from './useCelebrations';
import type { Badge } from '@/lib/types';

export function useBadges() {
  const { user } = useAuth();
  const { activeFamilyId, getTotalStars } = useApp();
  const { addCelebration } = useCelebrations();

  const totalStars = activeFamilyId ? getTotalStars(activeFamilyId) : 0;
  const unlockedBadges = getCurrentStageBadges(totalStars);
  const showBadges = shouldShowBadges(totalStars);

// Supabase-backed badge helpers are handled inline in checkForNewBadges

  const checkForNewBadges = useCallback(async (oldStars: number, newStars: number) => {
    if (!user || !activeFamilyId) return;

    const newBadges = getNewlyUnlockedBadges(oldStars, newStars);
    if (newBadges.length === 0) return;

    try {
      const badgeIds = newBadges.map(b => b.id);
      // Fetch existing badge rows for these ids
      const { data: existing, error: selError } = await supabase
        .from('user_badges')
        .select('badge_id, seen')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .in('badge_id', badgeIds);

      if (selError) {
        console.error('Failed to read user_badges:', selError);
        return;
      }

      const existingMap = new Map<string, { seen: boolean }>();
      (existing || []).forEach(row => existingMap.set(row.badge_id as string, { seen: row.seen as boolean }));

      const toInsert = [] as { user_id: string; family_id: string; badge_id: string; seen: boolean }[];
      const toMarkSeen: string[] = [];
      const celebrate: typeof newBadges = [];

      for (const b of newBadges) {
        const ex = existingMap.get(b.id);
        if (!ex) {
          toInsert.push({ user_id: user.id, family_id: activeFamilyId, badge_id: b.id, seen: true });
          celebrate.push(b);
        } else if (!ex.seen) {
          toMarkSeen.push(b.id);
          celebrate.push(b);
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('user_badges').insert(toInsert);
        if (error) console.error('Failed to insert user_badges:', error);
      }

      if (toMarkSeen.length > 0) {
        const { error } = await supabase
          .from('user_badges')
          .update({ seen: true })
          .eq('user_id', user.id)
          .eq('family_id', activeFamilyId)
          .in('badge_id', toMarkSeen);
        if (error) console.error('Failed to mark badges as seen:', error);
      }

      celebrate.forEach(badge => addCelebration({ type: 'badge', badge }));
    } catch (e) {
      console.error('checkForNewBadges failed:', e);
    }
  }, [user, activeFamilyId, addCelebration]);

  // Reset seen badges when character is reset
  const resetBadgeProgress = useCallback(async () => {
    if (!user || !activeFamilyId) return;
    
    try {
      // Clear all badges for this user and family in Supabase
      const { error } = await supabase
        .from('user_badges')
        .delete()
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId);
        
      if (error) {
        console.error('Failed to reset badge progress in Supabase:', error);
      }
    } catch (error) {
      console.error('Error resetting badge progress:', error);
    }
  }, [user, activeFamilyId]);

  return {
    unlockedBadges,
    showBadges,
    checkForNewBadges,
    resetBadgeProgress,
  };
}