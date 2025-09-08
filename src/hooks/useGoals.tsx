import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useCelebrations } from './useCelebrations';
import { supabase } from '@/integrations/supabase/client';
import { Goal } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function useGoals() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const { addCelebration } = useCelebrations();
  const { toast } = useToast();

  const updateGoalProgress = useCallback(async (taskCategoryId: string, starValue: number) => {
    if (!user || !activeFamilyId) return;

    try {
      // Get active goal from Supabase
      const { data: goals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .eq('completed', false)
        .limit(1);

      if (error) {
        console.error('Error loading goals:', error);
        return;
      }

      const activeGoal = goals && goals.length > 0 ? goals[0] : null;
      if (!activeGoal) return;

      // Check if this task's category should count towards the goal
      let shouldCount = true;
      if (activeGoal.target_categories && activeGoal.target_categories.length > 0) {
        shouldCount = activeGoal.target_categories.includes(taskCategoryId);
      }

      if (!shouldCount) return;

      // Update goal progress
      const newCurrentStars = activeGoal.current_stars + starValue;
      const isCompleted = newCurrentStars >= activeGoal.target_stars;

      const { error: updateError } = await supabase
        .from('goals')
        .update({
          current_stars: newCurrentStars,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', activeGoal.id);

      if (updateError) {
        console.error('Error updating goal:', updateError);
        return;
      }

      // Show celebration if goal is completed
      if (isCompleted) {
        const completedGoal: Goal = {
          id: activeGoal.id,
          familyId: activeGoal.family_id,
          userId: activeGoal.user_id,
          targetStars: activeGoal.target_stars,
          targetCategories: activeGoal.target_categories,
          reward: activeGoal.reward,
          currentStars: newCurrentStars,
          completed: true,
          completedAt: new Date().toISOString(),
          createdAt: activeGoal.created_at,
        };
        addCelebration({ type: 'goal', goal: completedGoal });
      }
    } catch (error) {
      console.error('Error in updateGoalProgress:', error);
    }
  }, [user, activeFamilyId, addCelebration]);

  return {
    updateGoalProgress,
  };
}