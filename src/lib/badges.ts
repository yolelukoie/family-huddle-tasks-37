import { BABY_STAGE_BADGES, CHILD_STAGE_BADGES, TEENAGER_STAGE_BADGES, YOUNG_ADULT_STAGE_BADGES, ON_THE_RISE_STAGE_BADGES, ADULT_STAGE_BADGES, MATURE_ADULT_STAGE_BADGES, GOLDEN_CHAPTER_STAGE_BADGES } from './constants';
import { storage } from './storage';
import type { Badge } from './types';

// Get all badges defined in the system
function getAllBadges(): Badge[] {
  return [
    ...BABY_STAGE_BADGES,
    ...CHILD_STAGE_BADGES,
    ...TEENAGER_STAGE_BADGES,
    ...YOUNG_ADULT_STAGE_BADGES,
    ...ON_THE_RISE_STAGE_BADGES,
    ...ADULT_STAGE_BADGES,
    ...MATURE_ADULT_STAGE_BADGES,
    ...GOLDEN_CHAPTER_STAGE_BADGES,
  ];
}

export function getBabyBadges(totalStars: number): Badge[] {
  return BABY_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getChildBadges(totalStars: number): Badge[] {
  return CHILD_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getTeenagerBadges(totalStars: number): Badge[] {
  return TEENAGER_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getYoungAdultBadges(totalStars: number): Badge[] {
  return YOUNG_ADULT_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getMatureAdultBadges(totalStars: number): Badge[] {
  return MATURE_ADULT_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getAdultBadges(totalStars: number): Badge[] {
  return ADULT_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getOnTheRiseBadges(totalStars: number): Badge[] {
  return ON_THE_RISE_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

export function getGoldenChapterBadges(totalStars: number): Badge[] {
  return GOLDEN_CHAPTER_STAGE_BADGES.filter(badge => totalStars >= badge.unlockStars);
}

/**
 * Get ALL badges earned across all stages up to the current star count.
 * This ensures users keep their previously earned badges when they progress to new stages.
 */
export function getCurrentStageBadges(totalStars: number): Badge[] {
  // Return ALL badges that the user has unlocked across all stages
  return getAllBadges().filter(badge => totalStars >= badge.unlockStars);
}

/**
 * Get badges that were newly unlocked between oldStars and newStars.
 * Compares across all stages to properly detect new badges.
 */
export function getNewlyUnlockedBadges(oldStars: number, newStars: number): Badge[] {
  const oldBadges = getCurrentStageBadges(oldStars);
  const newBadges = getCurrentStageBadges(newStars);
  
  const oldBadgeIds = new Set(oldBadges.map(b => b.id));
  return newBadges.filter(badge => !oldBadgeIds.has(badge.id));
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
  return totalStars >= 600 && totalStars < 700;
}

export function isMatureAdultStage(totalStars: number): boolean {
  return totalStars >= 700 && totalStars < 800;
}

export function isGoldenChapterStage(totalStars: number): boolean {
  return totalStars >= 800;
}

export function shouldShowBadges(totalStars: number): boolean {
  return totalStars < 1000; // Show badges for Baby, Child, Teenager, Young Adult, On the Rise, Adult, Mature Adult, and Golden Chapter stages
}
