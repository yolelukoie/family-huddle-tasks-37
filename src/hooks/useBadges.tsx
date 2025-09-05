import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useApp } from './useApp';
import { getCurrentStageBadges, getNewlyUnlockedBadges, shouldShowBadges } from '@/lib/badges';
import { storage } from '@/lib/storage';
import type { Badge } from '@/lib/types';

export interface BadgeCelebration {
  badge: Badge;
  show: boolean;
}

export function useBadges() {
  const { user } = useAuth();
  const { activeFamilyId, getTotalStars } = useApp();
  const [celebration, setCelebration] = useState<BadgeCelebration | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<Badge[]>([]);

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

  const triggerCelebration = useCallback((badge: Badge) => {
    setCelebration({ badge, show: true });
    
    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      setCelebration(prev => prev ? { ...prev, show: false } : null);
      setTimeout(() => setCelebration(null), 300); // Allow fade out animation
    }, 2000);
  }, []);

  const processCelebrationQueue = useCallback(() => {
    if (celebrationQueue.length > 0 && !celebration) {
      const nextBadge = celebrationQueue[0];
      setCelebrationQueue(prev => prev.slice(1));
      triggerCelebration(nextBadge);
    }
  }, [celebrationQueue, celebration, triggerCelebration]);

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
      
      // Queue celebrations
      setCelebrationQueue(prev => [...prev, ...unseenNewBadges]);
    }
  }, [user, activeFamilyId, getSeenBadges, markBadgeAsSeen]);

  // Process celebration queue
  useEffect(() => {
    const timer = setTimeout(processCelebrationQueue, 500);
    return () => clearTimeout(timer);
  }, [processCelebrationQueue]);

  // Reset seen badges when character is reset
  const resetBadgeProgress = useCallback(() => {
    if (user && activeFamilyId) {
      clearSeenBadges(activeFamilyId, user.id);
    }
  }, [user, activeFamilyId, clearSeenBadges]);

  return {
    unlockedBadges,
    showBadges,
    celebration,
    checkForNewBadges,
    resetBadgeProgress,
  };
}