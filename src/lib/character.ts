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
  
  // Format stage number with leading zeros (000, 050, 200, etc.)
  const stageStr = stage.toString().padStart(3, '0');
  
  // Use public folder images
  return `/${effectiveGender}_stage_${stageStr}.png`;
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