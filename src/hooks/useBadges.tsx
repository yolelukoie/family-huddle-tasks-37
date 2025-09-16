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

  // Repair total stars data consistency by recalculating from completed tasks
  const repairStarsConsistency = useCallback(async () => {
    if (!user || !activeFamilyId) return;

    try {
      // Get all completed tasks for this user in this family
      const { data: completedTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('star_value')
        .eq('family_id', activeFamilyId)
        .eq('assigned_to', user.id)
        .eq('completed', true);

      if (tasksError) {
        console.error('useBadges: Failed to load completed tasks for consistency check:', tasksError);
        return;
      }

      const actualTotalStars = (completedTasks || []).reduce((sum, task) => sum + (task.star_value || 0), 0);
      
      // Get current total from user_families
      const { data: userFamily, error: familyError } = await supabase
        .from('user_families')
        .select('total_stars')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .single();

      if (familyError) {
        console.error('useBadges: Failed to load user family data:', familyError);
        return;
      }

      const recordedTotalStars = userFamily?.total_stars || 0;

      if (actualTotalStars !== recordedTotalStars) {
        console.warn(`useBadges: Stars inconsistency detected! Recorded: ${recordedTotalStars}, Actual: ${actualTotalStars}. Repairing...`);
        
        // Update the total stars to match actual completed tasks
        const { error: updateError } = await supabase
          .from('user_families')
          .update({ total_stars: actualTotalStars })
          .eq('user_id', user.id)
          .eq('family_id', activeFamilyId);

        if (updateError) {
          console.error('useBadges: Failed to repair stars consistency:', updateError);
        } else {
          console.log(`useBadges: Successfully repaired stars: ${recordedTotalStars} -> ${actualTotalStars}`);
          // Trigger a refresh of the app data
          window.dispatchEvent(new CustomEvent('tasks:changed'));
        }
      } else {
        console.log(`useBadges: Stars consistency OK: ${actualTotalStars} stars`);
      }
    } catch (error) {
      console.error('useBadges: Error in stars consistency repair:', error);
    }
  }, [user, activeFamilyId]);

  // Load persisted badges from database
  const loadPersistedBadges = useCallback(async () => {
    if (!user || !activeFamilyId) {
      setPersistedBadges(new Set());
      return;
    }

    try {
      setIsLoading(true);
      
      // First repair stars consistency
      await repairStarsConsistency();
      
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
  }, [user, activeFamilyId, repairStarsConsistency]);

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

  const checkForNewBadges = useCallback(async (oldStars: number, newStars: number) => {
    if (!user || !activeFamilyId) return;

    try {
      const newBadges = getNewlyUnlockedBadges(oldStars, newStars);
      if (newBadges.length === 0) return;

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
      
      // Emit event for badge displays to refresh
      window.dispatchEvent(new CustomEvent('badges:changed'));
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
    checkForNewBadges,
    resetBadgeProgress,
    isLoading,
    totalStars,
  };
}