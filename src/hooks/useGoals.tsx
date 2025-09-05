import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useApp } from './useApp';
import { storage } from '@/lib/storage';
import { Goal } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export interface GoalCelebration {
  goal: Goal;
  show: boolean;
}

export function useGoals() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const [celebration, setCelebration] = useState<GoalCelebration | null>(null);
  const { toast } = useToast();

  const updateGoalProgress = useCallback((taskCategoryId: string, starValue: number) => {
    if (!user || !activeFamilyId) return;

    const goals = storage.getGoals(activeFamilyId, user.id);
    const activeGoal = goals.find(g => !g.completed);
    
    if (!activeGoal) return;

    // Check if this task's category should count towards the goal
    let shouldCount = true;
    if (activeGoal.targetCategories && activeGoal.targetCategories.length > 0) {
      shouldCount = activeGoal.targetCategories.includes(taskCategoryId);
    }

    if (!shouldCount) return;

    // Update goal progress
    const newCurrentStars = activeGoal.currentStars + starValue;
    const isCompleted = newCurrentStars >= activeGoal.targetStars;

    storage.updateGoal(activeGoal.id, {
      currentStars: newCurrentStars,
      completed: isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined
    });

    // Show celebration if goal is completed
    if (isCompleted) {
      setCelebration({
        goal: { ...activeGoal, currentStars: newCurrentStars, completed: true },
        show: true
      });
      
      toast({
        title: "Goal Achieved! 🎉",
        description: `You've reached your goal of ${activeGoal.targetStars} stars!`,
      });
    }
  }, [user, activeFamilyId, toast]);

  const completeCelebration = useCallback(() => {
    setCelebration(null);
  }, []);

  return {
    celebration,
    updateGoalProgress,
    completeCelebration,
  };
}