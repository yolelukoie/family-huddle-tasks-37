import { useState, useCallback, useEffect } from 'react';
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
  const [persistedBadges, setPersistedBadges] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Safely get total stars with fallback
  const totalStars = (activeFamilyId && getTotalStars) ? getTotalStars(activeFamilyId) : 0;
  const availableBadges = getCurrentStageBadges(totalStars);
  const showBadges = shouldShowBadges(totalStars);

  // Combine available badges with persisted status
  const unlockedBadges = availableBadges.filter(badge => persistedBadges.has(badge.id));

  // Load persisted badges from database
  const loadPersistedBadges = useCallback(async () => {
    if (!user || !activeFamilyId) {
      setPersistedBadges(new Set());
      return;
    }

    try {
      setIsLoading(true);
      
      // NOTE: repairStarsConsistency was removed - it was causing data corruption
      // by overwriting stars after character resets when task deletion failed.
      // Stars are now only modified through explicit user actions.
      
      const { data, error } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId);

      if (error) {
        console.error('useBadges: Failed to load persisted badges:', error);
        return;
      }

      const badgeIds = new Set((data || []).map(row => row.badge_id as string));
      setPersistedBadges(badgeIds);
      console.log('useBadges: Loaded persisted badges:', Array.from(badgeIds));
    } catch (error) {
      console.error('useBadges: Error loading persisted badges:', error);
    } finally {
    setIsLoading(false);
    }
  }, [user, activeFamilyId]);

  // Load badges when family changes
  useEffect(() => {
    loadPersistedBadges();
  }, [loadPersistedBadges]);

  // Listen for badge changes
  useEffect(() => {
    const handler = () => {
      console.log('Badge change event received, reloading badges');
      loadPersistedBadges();
    };
    window.addEventListener('badges:changed', handler);
    return () => window.removeEventListener('badges:changed', handler);
  }, [loadPersistedBadges]);

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
      
      // Emit event for badge displays to refresh
      window.dispatchEvent(new CustomEvent('badges:changed'));
    } catch (error) {
      console.error('Error resetting badge progress:', error);
    }
  }, [user, activeFamilyId]);

  return {
    unlockedBadges,
    availableBadges,
    showBadges,
    resetBadgeProgress,
    isLoading,
    totalStars,
  };
}