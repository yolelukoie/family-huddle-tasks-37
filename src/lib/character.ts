import { CHARACTER_STAGES } from './constants';
import type { User } from './types';

export function getCurrentStage(totalStars: number): number {
  // Find the highest stage threshold that the user has reached
  let currentStage = 0;
  for (const stage of CHARACTER_STAGES) {
    if (totalStars >= stage.requiredStars) {
      currentStage = stage.stage;
    } else {
      break;
    }
  }
  return currentStage;
}

export function getNextStage(totalStars: number): { stage: number; requiredStars: number } | null {
  const currentStageIndex = CHARACTER_STAGES.findIndex(stage => totalStars < stage.requiredStars);
  if (currentStageIndex === -1) return null; // Already at max stage
  return CHARACTER_STAGES[currentStageIndex];
}

export function getStageProgress(totalStars: number): { current: number; target: number; percentage: number } {
  const nextStage = getNextStage(totalStars);
  if (!nextStage) {
    // At max stage
    const maxStage = CHARACTER_STAGES[CHARACTER_STAGES.length - 1];
    return { current: totalStars, target: maxStage.requiredStars, percentage: 100 };
  }

  const currentStage = getCurrentStage(totalStars);
  const currentStageData = CHARACTER_STAGES.find(s => s.stage === currentStage);
  const baseStars = currentStageData?.requiredStars || 0;
  
  const starsInCurrentLevel = totalStars - baseStars;
  const starsNeededForNext = nextStage.requiredStars - baseStars;
  const percentage = starsNeededForNext > 0 ? (starsInCurrentLevel / starsNeededForNext) * 100 : 0;

  return {
    current: starsInCurrentLevel,
    target: starsNeededForNext,
    percentage: Math.min(percentage, 100)
  };
}

export function getCharacterImagePath(gender: 'male' | 'female' | 'other', stage: number): string {
  // For 'other', default to female images
  const effectiveGender = gender === 'other' ? 'female' : gender;
  // Mapping of female stages to uploaded images
  const femaleStageImages: Record<number, string> = {
    0: '/lovable-uploads/ff060815-4aa7-402c-a2b9-343c1e7a4bf1.png',
    50: '/lovable-uploads/8e44eb0d-f6f2-40cf-b36f-9b407ca9d581.png', 
    200: '/lovable-uploads/8b3d5bae-b138-43ee-9af6-1846907c1ab6.png',
    350: '/lovable-uploads/a02ad475-a7f2-45db-baaa-204ba7f6b82a.png',
    500: '/lovable-uploads/8794f1f3-bf37-49cb-a516-421d96999f3d.png',
    600: '/lovable-uploads/138f7453-8634-45c6-b2b3-6b44bf1297fe.png',
    700: '/lovable-uploads/b51674ec-939c-4e24-9ecb-2f9cf19f4526.png',
    800: '/lovable-uploads/7a1079f4-1eff-437f-858d-dc04c7493679.png'
  };

  // Mapping of male stages to uploaded images
  const maleStageImages: Record<number, string> = {
    0: '/lovable-uploads/71c3b5b5-9781-4042-b774-82bdf23af465.png',
    50: '/lovable-uploads/94c2e039-882b-4890-9173-1e7555ed04c0.png', 
    200: '/lovable-uploads/9740a3d8-1664-457b-80a2-0e9caad66358.png',
    350: '/lovable-uploads/9b069300-3c2a-48ce-90c5-55a898aef9b9.png',
    500: '/lovable-uploads/47659389-0e9d-4bc6-9239-28bb582e213a.png',
    600: '/lovable-uploads/89b6d0ce-d747-4ee6-a1c4-7a0521b5ab47.png',
    700: '/lovable-uploads/31ebd777-bffc-4065-9955-d702c93fe9b3.png',
    800: '/lovable-uploads/640c6f87-bba4-4fb9-9d66-40d4e05e746f.png'
  };

  if (effectiveGender === 'female' && femaleStageImages[stage]) {
    return femaleStageImages[stage];
  }

  if (effectiveGender === 'male' && maleStageImages[stage]) {
    return maleStageImages[stage];
  }

  // Fallback to placeholder for missing images
  return `/character-placeholder-${effectiveGender}-${stage}.png`;
}

export function getStageName(stage: number): string {
  const stageData = CHARACTER_STAGES.find(s => s.stage === stage);
  return stageData?.name || 'Unknown';
}

export function getUnlockedBadges(totalStars: number): number[] {
  const badges: number[] = [];
  const stageThresholds = CHARACTER_STAGES.map(s => s.requiredStars);
  
  for (let stars = 10; stars <= totalStars; stars += 10) {
    // Skip badge if it's at a stage threshold
    if (!stageThresholds.includes(stars)) {
      badges.push(stars);
    }
  }
  
  return badges;
}