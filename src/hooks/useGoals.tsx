import { useState, useEffect, useCallback } from 'react';
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);

  // Load goals for active family and user
  const loadGoals = useCallback(async () => {
    if (!user || !activeFamilyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading goals:', error);
        return;
      }

      const convertedGoals: Goal[] = (data || []).map(goal => ({
        id: goal.id,
        familyId: goal.family_id,
        userId: goal.user_id,
        targetStars: goal.target_stars,
        targetCategories: goal.target_categories,
        reward: goal.reward,
        currentStars: goal.current_stars,
        completed: goal.completed,
        completedAt: goal.completed_at,
        createdAt: goal.created_at,
      }));

      setGoals(convertedGoals);
    } catch (error) {
      console.error('Error in loadGoals:', error);
    } finally {
      setLoading(false);
    }
  }, [user, activeFamilyId]);

  // Load goals when family changes
  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  // Set up realtime subscription
  useEffect(() => {
    if (!user || !activeFamilyId) return;

    const channelName = `goals:${user.id}:${activeFamilyId}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goals',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadGoals();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeFamilyId, loadGoals]);

  const createGoal = useCallback(async (goalData: Omit<Goal, 'id' | 'createdAt' | 'currentStars' | 'completed' | 'completedAt'>) => {
    if (!user || !activeFamilyId) return null;

    try {
      const { data, error } = await supabase
        .from('goals')
        .insert([{
          family_id: activeFamilyId,
          user_id: user.id,
          target_stars: goalData.targetStars,
          target_categories: goalData.targetCategories,
          reward: goalData.reward
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating goal:', error);
        toast({
          title: "Error",
          description: "Failed to create goal",
          variant: "destructive",
        });
        return null;
      }

      const newGoal: Goal = {
        id: data.id,
        familyId: data.family_id,
        userId: data.user_id,
        targetStars: data.target_stars,
        targetCategories: data.target_categories,
        reward: data.reward,
        currentStars: data.current_stars,
        completed: data.completed,
        completedAt: data.completed_at,
        createdAt: data.created_at,
      };

      setGoals(prev => [newGoal, ...prev]);
      return newGoal;
    } catch (error) {
      console.error('Error in createGoal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal",
        variant: "destructive",
      });
      return null;
    }
  }, [user, activeFamilyId, toast]);

  const deleteGoal = useCallback(async (goalId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting goal:', error);
        toast({
          title: "Error",
          description: "Failed to delete goal",
          variant: "destructive",
        });
        return false;
      }

      setGoals(prev => prev.filter(g => g.id !== goalId));
      return true;
    } catch (error) {
      console.error('Error in deleteGoal:', error);
      toast({
        title: "Error",
        description: "Failed to delete goal",
        variant: "destructive",
      });
      return false;
    }
  }, [user, toast]);

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

  const activeGoal = goals.find(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  return {
    goals,
    activeGoal,
    completedGoals,
    loading,
    createGoal,
    deleteGoal,
    updateGoalProgress,
    refreshGoals: loadGoals,
  };
}