import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useApp } from './useApp';
import { getCurrentStageBadges, getNewlyUnlockedBadges, shouldShowBadges } from '@/lib/badges';
import { storage } from '@/lib/storage';
import { useCelebrations } from './useCelebrations';
import type { Badge } from '@/lib/types';

export function useBadges() {
  const { user } = useAuth();
  const { activeFamilyId, getTotalStars } = useApp();
  const { addCelebration } = useCelebrations();

  const totalStars = activeFamilyId ? getTotalStars(activeFamilyId) : 0;
  const unlockedBadges = getCurrentStageBadges(totalStars);
  const showBadges = shouldShowBadges(totalStars);

  const getSeenBadges = useCallback((familyId: string, userId: string): string[] => {
    return storage.getSeenBadges(familyId, userId);
  }, []);

  const markBadgeAsSeen = useCallback((familyId: string, userId: string, badgeId: string) => {
    storage.addSeenBadge(familyId, userId, badgeId);
  }, []);

  const clearSeenBadges = useCallback((familyId: string, userId: string) => {
    storage.clearSeenBadges(familyId, userId);
  }, []);

  const checkForNewBadges = useCallback((oldStars: number, newStars: number) => {
    if (!user || !activeFamilyId) return;

    const newBadges = getNewlyUnlockedBadges(oldStars, newStars);
    const seenBadges = getSeenBadges(activeFamilyId, user.id);
    
    const unseenNewBadges = newBadges.filter(badge => !seenBadges.includes(badge.id));
    
    if (unseenNewBadges.length > 0) {
      // Mark badges as seen immediately to prevent duplicates
      unseenNewBadges.forEach(badge => {
        markBadgeAsSeen(activeFamilyId, user.id, badge.id);
      });
      
      // Add celebrations to queue
      unseenNewBadges.forEach(badge => {
        addCelebration({ type: 'badge', badge });
      });
    }
  }, [user, activeFamilyId, getSeenBadges, markBadgeAsSeen, addCelebration]);

  // Reset seen badges when character is reset
  const resetBadgeProgress = useCallback(() => {
    if (user && activeFamilyId) {
      clearSeenBadges(activeFamilyId, user.id);
    }
  }, [user, activeFamilyId, clearSeenBadges]);

  return {
    unlockedBadges,
    showBadges,
    checkForNewBadges,
    resetBadgeProgress,
  };
}