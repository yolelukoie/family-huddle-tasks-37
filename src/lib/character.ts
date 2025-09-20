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
  const supabaseUrl = 'https://zglvtspmrihotbfbjtvw.supabase.co/storage/v1/object/public/character-images';
  
  // Mapping of female stages to Supabase storage
  const femaleStageImages: Record<number, string> = {
    0: `${supabaseUrl}/female_stage_000.png`,
    50: `${supabaseUrl}/female_stage_050.png`, 
    200: `${supabaseUrl}/female_stage_200.png`,
    350: `${supabaseUrl}/female_stage_350.png`,
    500: `${supabaseUrl}/female_stage_500.png`,
    600: `${supabaseUrl}/female_stage_600.png`,
    700: `${supabaseUrl}/female_stage_700.png`,
    800: `${supabaseUrl}/female_stage_800.png`
  };

  // Mapping of male stages to Supabase storage
  const maleStageImages: Record<number, string> = {
    0: `${supabaseUrl}/male_stage_000.png`,
    50: `${supabaseUrl}/male_stage_050.png`, 
    200: `${supabaseUrl}/male_stage_200.png`,
    350: `${supabaseUrl}/male_stage_350.png`,
    500: `${supabaseUrl}/male_stage_500.png`,
    600: `${supabaseUrl}/male_stage_600.png`,
    700: `${supabaseUrl}/male_stage_700.png`,
    800: `${supabaseUrl}/male_stage_800.png`
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