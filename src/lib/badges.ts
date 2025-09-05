import { BABY_STAGE_BADGES, CHILD_STAGE_BADGES, TEENAGER_STAGE_BADGES, ADULT_STAGE_BADGES, ON_THE_RISE_STAGE_BADGES } from './constants';
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

export function getAdultBadges(totalStars: number): Badge[] {
  return ADULT_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getOnTheRiseBadges(totalStars: number): Badge[] {
  return ON_THE_RISE_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getCurrentStageBadges(totalStars: number): Badge[] {
  if (totalStars < 50) {
    return getBabyBadges(totalStars);
  } else if (totalStars < 200) {
    return getChildBadges(totalStars);
  } else if (totalStars < 350) {
    return getTeenagerBadges(totalStars);
  } else if (totalStars < 500) {
    return getAdultBadges(totalStars);
  } else if (totalStars < 600) {
    return getOnTheRiseBadges(totalStars);
  } else {
    return []; // Adult stage and beyond - no badges implemented yet
  }
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
  return totalStars >= 200 && totalStars < 350;
}

export function isYoungAdultStage(totalStars: number): boolean {
  return totalStars >= 350 && totalStars < 500;
}

export function isOnTheRiseStage(totalStars: number): boolean {
  return totalStars >= 500 && totalStars < 600;
}

export function isAdultStage(totalStars: number): boolean {
  return totalStars >= 600;
}

export function shouldShowBadges(totalStars: number): boolean {
  return totalStars < 600; // Show badges for Baby, Child, Teenager, Young Adult, and On the Rise stages
}