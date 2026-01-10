import { useState, useEffect, useRef } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useBadges } from '@/hooks/useBadges';
// useGoals is used for goal state but goal updates happen via TasksPage
import { useCelebrations } from '@/hooks/useCelebrations';
import { useTasks } from '@/hooks/useTasks';
import { useCustomCharacterImages } from '@/hooks/useCustomCharacterImages';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { DraggableBadgeDisplay } from '@/components/badges/DraggableBadgeDisplay';
import { BadgeCelebration } from '@/components/badges/BadgeCelebration';
import { GoalCelebration } from '@/components/celebrations/GoalCelebration';
import { ROUTES } from '@/lib/constants';
import { getCurrentStage, getStageProgress, getStageName } from '@/lib/character';
import { translateTaskName, translateCategoryName, translateTaskDescription } from '@/lib/translations';
import { supabase } from '@/integrations/supabase/client';
import { isToday } from '@/lib/utils';
import { AssignTaskModal } from '@/components/modals/AssignTaskModal';
import { MilestoneCelebration } from '@/components/celebrations/MilestoneCelebration';
import { Star, Calendar, Plus, RotateCcw, CheckCircle } from 'lucide-react';

export default function MainPage() {
  // ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  const { user, isAuthenticated, isLoading } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const {
    activeFamilyId,
    getTotalStars,
    resetCharacterProgress,
    addStars,
    families
  } = useApp();
  
  const {
    unlockedBadges,
    showBadges,
    checkForNewBadges,
    resetBadgeProgress
  } = useBadges();
  
  // Note: Goal progress is handled by TasksPage, not here (to avoid duplicate celebrations)
  const { currentCelebration, completeCelebration, addCelebration } = useCelebrations();
  const { tasks, categories, updateTask } = useTasks();
  const { getImagePath } = useCustomCharacterImages();

  // All useState hooks
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previousStars, setPreviousStars] = useState(0);
  const [containerDimensions, setContainerDimensions] = useState({ width: 320, height: 160 });
  const [activeGoal, setActiveGoal] = useState<any>(null);
  
  // All useRef hooks
  const badgeContainerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Derived values (computed after hooks, before conditionals)
  const totalStars = getTotalStars(activeFamilyId || '');
  const currentStage = getCurrentStage(totalStars);
  const stageProgress = getStageProgress(totalStars);
  const stageName = getStageName(currentStage);
  const characterImagePath = getImagePath(user?.gender || 'male', currentStage);
  const currentFamily = activeFamilyId ? families.find(f => f.id === activeFamilyId) : null;

  // Measure actual container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (badgeContainerRef.current) {
        const rect = badgeContainerRef.current.getBoundingClientRect();
        setContainerDimensions({
          width: Math.floor(rect.width),
          height: Math.floor(rect.height)
        });
      }
    };
    
    // Initial measurement
    updateDimensions();
    
    // Measure on resize
    window.addEventListener('resize', updateDimensions);
    
    // Also measure after a short delay to ensure styles are applied
    timeoutRef.current = setTimeout(updateDimensions, 100);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Sync previousStars with totalStars on initial load
  useEffect(() => {
    if (previousStars === 0 && totalStars > 0) {
      setPreviousStars(totalStars);
    }
  }, [previousStars, totalStars]);

  // Track if we're currently resetting to prevent double-reset
  const isResettingRef = useRef(false);

  // Check for newly unlocked badges and milestone when stars change
  useEffect(() => {
    if (previousStars !== totalStars && previousStars !== 0) {
      // Check for 1000 star milestone celebration
      if (previousStars < 1000 && totalStars >= 1000 && !isResettingRef.current) {
        // Set flag to prevent double-reset
        isResettingRef.current = true;
        
        // Add milestone celebration to queue
        addCelebration({ type: 'milestone', milestone: { stars: 1000 } });
      } else if (!isResettingRef.current) {
        checkForNewBadges(previousStars, totalStars);
      }
    }
    setPreviousStars(totalStars);
  }, [totalStars, previousStars, checkForNewBadges, addCelebration]);

  // Handle milestone celebration completion - reset character when milestone celebration finishes
  useEffect(() => {
    if (currentCelebration?.item.type === 'milestone' && !currentCelebration.show && isResettingRef.current) {
      // Celebration just finished, now reset
      const performReset = async () => {
        await resetCharacterProgress(activeFamilyId || '');
        resetBadgeProgress();
        setPreviousStars(0);
        isResettingRef.current = false;
      };
      performReset();
    }
  }, [currentCelebration, resetCharacterProgress, resetBadgeProgress, activeFamilyId]);

  // Get active goal (fetch from Supabase)
  useEffect(() => {
    const fetchActiveGoal = async () => {
      if (!user?.id || !activeFamilyId) return;
      
      const { data } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .eq('completed', false)
        .limit(1);
        
      setActiveGoal(data && data.length > 0 ? data[0] : null);
    };
    
    fetchActiveGoal();
  }, [user?.id, activeFamilyId, refreshKey]);

  // CONDITIONAL RETURNS AFTER ALL HOOKS
  if (isLoading) {
    return <div className="p-6">{t('main.loading')}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If you require onboarding before main:
  if (!user?.profileComplete) return <Navigate to="/onboarding" replace />;

  // Get today's tasks from useTasks hook - only tasks assigned to current user
  const todaysTasks = tasks.filter(task => !task.completed && isToday(task.dueDate) && task.assignedTo === user?.id);

  // Get task categories for star breakdown from useTasks hook
  const completedTasks = tasks.filter(task => task.completed && task.assignedTo === user?.id);
  const categoryStars = categories.map(category => {
    const categoryTasks = completedTasks.filter(task => task.categoryId === category.id);
    const stars = categoryTasks.reduce((sum, task) => sum + task.starValue, 0);
    return {
      category: translateCategoryName(category.name, t),
      stars
    };
  });

  const handleCompleteTask = async (taskId: string) => {
    const task = todaysTasks.find(t => t.id === taskId);
    if (!task) return;
    
    console.log('MainPage: Completing task', taskId, 'stars:', task.starValue, 'assigned to:', task.assignedTo, 'user:', user?.id);
    
    await updateTask(taskId, {
      completed: true,
      completedAt: new Date().toISOString()
    });

    // Stars are updated by updateTask via applyStarsDelta
    // Update goal progress (import useGoals at top)
    if (task.assignedTo === user?.id && activeFamilyId) {
      const { updateGoalProgress } = await import('@/hooks/useGoals').then(m => {
        // Can't use hook here, call supabase directly
        return { updateGoalProgress: null };
      });
      // Goal progress updated via direct supabase call below
      await updateGoalProgressDirectly(task.categoryId, task.starValue);
    }

    // Refresh component to show updated goal progress
    setRefreshKey(prev => prev + 1);
  };

  // Direct goal progress update function (since we can't use hooks inside callbacks)
  const updateGoalProgressDirectly = async (taskCategoryId: string, starValue: number) => {
    if (!user?.id || !activeFamilyId) return;

    try {
      // Get active goal from Supabase
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .eq('completed', false)
        .limit(1);

      const activeGoalData = goals && goals.length > 0 ? goals[0] : null;
      if (!activeGoalData) return;

      // Check if this task's category should count towards the goal
      let shouldCount = true;
      if (activeGoalData.target_categories && activeGoalData.target_categories.length > 0) {
        // Validate that target categories still exist
        const { data: existingCategories } = await supabase
          .from('task_categories')
          .select('id')
          .eq('family_id', activeFamilyId)
          .in('id', activeGoalData.target_categories);
        
        const validCategoryIds = (existingCategories || []).map(c => c.id);
        shouldCount = validCategoryIds.includes(taskCategoryId);
      }

      if (!shouldCount) return;

      // Update goal progress
      const newCurrentStars = activeGoalData.current_stars + starValue;
      const isCompleted = newCurrentStars >= activeGoalData.target_stars;

      await supabase
        .from('goals')
        .update({
          current_stars: newCurrentStars,
          completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', activeGoalData.id);

      // Goal celebration is handled by useCelebrations context
      if (isCompleted) {
        addCelebration({ 
          type: 'goal', 
          goal: {
            id: activeGoalData.id,
            familyId: activeGoalData.family_id,
            userId: activeGoalData.user_id,
            targetStars: activeGoalData.target_stars,
            targetCategories: activeGoalData.target_categories,
            reward: activeGoalData.reward,
            currentStars: newCurrentStars,
            completed: true,
            completedAt: new Date().toISOString(),
            createdAt: activeGoalData.created_at,
          }
        });
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
    }
  };

  const handleResetCharacter = async () => {
    if (window.confirm(t('main.resetConfirm'))) {
      await resetCharacterProgress(activeFamilyId || '');
      resetBadgeProgress();
      setPreviousStars(0);
    }
  };

  return <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={currentFamily?.name || t('main.title')} showBackButton={false} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[hsl(var(--icon-tint))] to-[hsl(var(--family-celebration))] bg-clip-text text-transparent mb-2">
            {t('main.hello')}, {user?.displayName}! ✨
          </h1>
        </div>

        {/* Character Block */}
        <Card accent className="bg-gradient-to-br from-[hsl(var(--gradient-start))]/20 to-[hsl(var(--gradient-end))]/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-[hsl(var(--icon-tint))]">
              <Star className="h-5 w-5 text-family-warm" />
              {stageName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Draggable area wrapper - extends up to cover CardHeader visually */}
            <div ref={badgeContainerRef} className="relative -mt-[72px] pt-[72px] pb-4">
              {/* Character Image and Badges */}
              <div className="flex justify-center mb-6 px-4">
                <div className="relative w-full max-w-80 h-40">
                  {/* Character Image Container */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-40 h-40">
                    <img src={characterImagePath} alt={`${user?.gender || 'character'} at ${stageName} stage`} className="w-40 h-40 object-contain" onError={e => {
                    // Fallback to emoji if image fails to load
                    const img = e.currentTarget;
                    const fallback = img.nextElementSibling as HTMLElement;
                    img.style.display = 'none';
                    if (fallback) fallback.style.display = 'block';
                  }} />
                    <span className="text-4xl hidden">👤</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('main.progressToNext')}</span>
                  <span>{stageProgress.current}/{stageProgress.target} {t('main.stars')}</span>
                </div>
                <Progress value={stageProgress.percentage} className="h-3" />
              </div>

              {/* Draggable Badges overlaying the ref container */}
              {showBadges && !!user?.id && !!activeFamilyId && (
                <DraggableBadgeDisplay
                  badges={unlockedBadges}
                  familyId={activeFamilyId}
                  userId={user.id}
                  containerBounds={containerDimensions}
                  className="absolute inset-0 pointer-events-none [&>*]:pointer-events-auto"
                />
              )}
            </div>

            {/* Category Breakdown - OUTSIDE draggable area */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {categoryStars.map(({
              category,
              stars
            }) => <div key={category} className="text-center p-2 bg-gradient-to-br from-[hsl(var(--gradient-start))]/20 to-[hsl(var(--gradient-end))]/10 rounded-lg border border-[hsl(var(--card-accent))]/20">
                  <div className="text-sm font-medium">{category}</div>
                  <div className="text-lg font-bold text-family-warm">{stars} ⭐</div>
                </div>)}
            </div>

            {/* Active Goal - OUTSIDE draggable area */}
            {activeGoal && <div className="p-3 bg-gradient-to-br from-[hsl(var(--gradient-start))]/20 to-[hsl(var(--gradient-end))]/10 rounded-lg border border-[hsl(var(--card-accent))]/30">
                <div className="text-sm font-medium text-[hsl(var(--icon-tint))]">{t('main.activeGoal')}</div>
                <div className="text-sm">{activeGoal.current_stars}/{activeGoal.target_stars} {t('main.stars')}</div>
                <Progress value={activeGoal.current_stars / activeGoal.target_stars * 100} className="h-2 mt-1" />
                {activeGoal.reward && <div className="text-xs text-muted-foreground mt-1">{t('main.reward')}: {activeGoal.reward}</div>}
              </div>}
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card accent>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[hsl(var(--icon-tint))]">
              <Calendar className="h-5 w-5" />
              {t('main.todayTasks')}
              <Badge variant="theme">{todaysTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysTasks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                {t('main.noTasksToday')}
              </div> : <div className="space-y-2">
                {todaysTasks.map(task => {
                  const translatedTaskName = translateTaskName(task.name, t);
                  const translatedTaskDescription = translateTaskDescription(task.description, t);
                  return (
                  <div key={`${task.id}-${refreshKey}`} className="flex items-center justify-between p-3 border rounded-lg hover:border-[hsl(var(--card-accent))]/40 transition-colors">
                    <div className="flex-1">
                      <div className="font-medium">{translatedTaskName}</div>
                      {translatedTaskDescription && <div className="text-sm text-muted-foreground">{translatedTaskDescription}</div>}
                    </div>
                     <div className="flex items-center gap-2">
                       <Badge variant="warm">{task.starValue} ⭐</Badge>
                       {task.assignedTo === user?.id && <Button onClick={() => handleCompleteTask(task.id)} size="sm" variant="ghost" className="p-2 h-8 w-8 text-family-success hover:text-family-success hover:bg-family-success/10">
                           <CheckCircle className="h-5 w-5" />
                         </Button>}
                     </div>
                  </div>
                  );
                })}
              </div>}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={() => navigate(ROUTES.tasks)} variant="theme" className="h-14">
            {t('main.goToTasks')}
          </Button>
          <Button onClick={() => setShowAssignTask(true)} variant="theme" className="h-14">
            <Plus className="h-5 w-5 mr-2" />
            {t('main.assignTask')}
          </Button>
        </div>
      </div>

      <AssignTaskModal open={showAssignTask} onOpenChange={setShowAssignTask} />

      {/* Unified Celebrations */}
      {currentCelebration && currentCelebration.item.type === 'badge' && (
        <BadgeCelebration 
          badge={currentCelebration.item.badge} 
          show={currentCelebration.show} 
          onComplete={completeCelebration}
        />
      )}
      
      {currentCelebration && currentCelebration.item.type === 'goal' && (
        <GoalCelebration 
          goal={currentCelebration.item.goal} 
          show={currentCelebration.show} 
          onComplete={completeCelebration}
        />
      )}
      
      {currentCelebration && currentCelebration.item.type === 'milestone' && (
        <MilestoneCelebration 
          show={currentCelebration.show} 
          onComplete={completeCelebration}
        />
      )}
    </div>;
}
