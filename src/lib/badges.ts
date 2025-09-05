import { BABY_STAGE_BADGES, CHILD_STAGE_BADGES, TEENAGER_STAGE_BADGES } from './constants';
import { storage } from './storage';
import type { Badge } from './types';

export function getBabyBadges(totalStars: number): Badge[] {
  return BABY_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getChildBadges(totalStars: number): Badge[] {
  return CHILD_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getTeenagerBadges(totalStars: number): Badge[] {
  return TEENAGER_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getCurrentStageBadges(totalStars: number): Badge[] {
  if (totalStars < 50) {
    return getBabyBadges(totalStars);
  } else if (totalStars < 200) {
    return getChildBadges(totalStars);
  } else if (totalStars < 400) {
    return getTeenagerBadges(totalStars);
  }
  return []; // For future stages
}

export function getNewlyUnlockedBadges(oldStars: number, newStars: number): Badge[] {
  const oldBadges = getCurrentStageBadges(oldStars);
  const newBadges = getCurrentStageBadges(newStars);
  
  return newBadges.filter(newBadge => 
    !oldBadges.some(oldBadge => oldBadge.id === newBadge.id)
  );
}

export function isBabyStage(totalStars: number): boolean {
  return totalStars < 50;
}

export function isChildStage(totalStars: number): boolean {
  return totalStars >= 50 && totalStars < 200;
}

export function isTeenagerStage(totalStars: number): boolean {
  return totalStars >= 200 && totalStars < 400;
}

export function shouldShowBadges(totalStars: number): boolean {
  return totalStars < 400; // Show badges for Baby, Child, and Teenager stages
}