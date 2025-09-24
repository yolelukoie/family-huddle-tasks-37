import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useBadges } from '@/hooks/useBadges';
import { useGoals } from '@/hooks/useGoals';
import { useCelebrations } from '@/hooks/useCelebrations';
import { useTasks } from '@/hooks/useTasks';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { DraggableBadgeDisplay } from '@/components/badges/DraggableBadgeDisplay';
import { BadgeCelebration } from '@/components/badges/BadgeCelebration';
import { GoalCelebration } from '@/components/celebrations/GoalCelebration';
import { ROUTES } from '@/lib/constants';
import { getCurrentStage, getStageProgress, getCharacterImagePath, getStageName } from '@/lib/character';
import { supabase } from '@/integrations/supabase/client';
import { isToday } from '@/lib/utils';
import { AssignTaskModal } from '@/components/modals/AssignTaskModal';
import { MilestoneCelebration } from '@/components/celebrations/MilestoneCelebration';
import { TaskAssignmentModal } from '@/components/modals/TaskAssignmentModal';
import { useTaskAssignments } from '@/hooks/useTaskAssignments';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { Star, Calendar, Plus, RotateCcw, CheckCircle } from 'lucide-react';
export default function MainPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-6">Loading…</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  // If you require onboarding before main:
  if (!user?.profileComplete) return <Navigate to="/onboarding" replace />;
  
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
  const {
    updateGoalProgress
  } = useGoals();
  const { currentCelebration, completeCelebration, addCelebration } = useCelebrations();
  const { tasks, categories, updateTask } = useTasks();
  const { 
    currentAssignment, 
    showAssignmentModal, 
    handleTaskResponse, 
    closeAssignmentModal 
  } = useTaskAssignments();
  
  // Check for task assignment notifications
  useTaskNotifications();
  const navigate = useNavigate();
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const totalStars = getTotalStars(activeFamilyId);
  const currentStage = getCurrentStage(totalStars);
  const stageProgress = getStageProgress(totalStars);
  const stageName = getStageName(currentStage);
  const characterImagePath = getCharacterImagePath(user?.gender || 'male', currentStage);

  const [previousStars, setPreviousStars] = useState(totalStars);

  // Check for newly unlocked badges and milestone when stars change
  useEffect(() => {
    if (previousStars !== totalStars && previousStars !== 0) {
      // Check for 1000 star milestone celebration
      if (previousStars < 1000 && totalStars >= 1000) {
        // Add milestone celebration to queue
        setTimeout(() => {
          addCelebration({ type: 'milestone', milestone: { stars: 1000 } });
          // Reset character after celebration is shown
          setTimeout(async () => {
            await resetCharacterProgress(activeFamilyId);
            resetBadgeProgress();
            setPreviousStars(0);
          }, 3500); // Wait for celebration to complete (3s) + buffer
        }, 100);
      } else {
        checkForNewBadges(previousStars, totalStars);
      }
    }
    setPreviousStars(totalStars);
  }, [totalStars, previousStars, checkForNewBadges, addCelebration, resetCharacterProgress, resetBadgeProgress, activeFamilyId]);

  // Get today's tasks from useTasks hook - only tasks assigned to current user
  const todaysTasks = tasks.filter(task => !task.completed && isToday(task.dueDate) && task.assignedTo === user?.id);

  // Get active goal (fetch from Supabase)
  const [activeGoal, setActiveGoal] = useState(null);
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

  // Get task categories for star breakdown from useTasks hook
  const completedTasks = tasks.filter(task => task.completed && task.assignedTo === user?.id);
  const categoryStars = categories.map(category => {
    const categoryTasks = completedTasks.filter(task => task.categoryId === category.id);
    const stars = categoryTasks.reduce((sum, task) => sum + task.starValue, 0);
    return {
      category: category.name,
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

    // Update goal progress if it's the user's task (stars are handled by TasksContext)
    if (task.assignedTo === user?.id) {
      await updateGoalProgress(task.categoryId, task.starValue);
    }

    // Refresh component to show updated goal progress
    setRefreshKey(prev => prev + 1);
  };
  const handleResetCharacter = async () => {
    if (window.confirm('Are you sure? This will reset your character progress for this family only.')) {
      await resetCharacterProgress(activeFamilyId);
      resetBadgeProgress();
      setPreviousStars(0);
    }
  };
  const currentFamily = activeFamilyId ? families.find(f => f.id === activeFamilyId) : null;

  return <div className="min-h-screen bg-background">
      <NavigationHeader title={currentFamily?.name || "Family Stars"} showBackButton={false} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-family-warm mb-2">
            Hello, {user?.displayName}! ✨
          </h1>
        </div>

        {/* Character Block */}
        <Card className="bg-gradient-to-br from-family-warm/10 to-family-celebration/10">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <Star className="h-5 w-5 text-family-star" />
              {stageName}
            </CardTitle>
          </CardHeader>
          <CardContent>
             {/* Character Image and Badges */}
            <div className="flex justify-center mb-6">
              <div className="relative w-80 h-40 overflow-hidden">
                {/* Character Image Container */}
                <div className="absolute left-1/2 transform -translate-x-1/2 w-40 h-40">
                  <img src={characterImagePath} alt={`${user?.gender || 'character'} character at ${stageName} stage`} className="w-40 h-40 object-contain" onError={e => {
                  // Fallback to emoji if image fails to load
                  const img = e.currentTarget;
                  const fallback = img.nextElementSibling as HTMLElement;
                  img.style.display = 'none';
                  if (fallback) fallback.style.display = 'block';
                }} />
                  <span className="text-4xl hidden">👤</span>
                </div>
                 
                  {/* Draggable Badges overlaying character */}
                  {showBadges && !!user?.id && !!activeFamilyId && (
                    <DraggableBadgeDisplay
                      badges={unlockedBadges}
                      familyId={activeFamilyId}
                      userId={user.id}
                      containerBounds={{ width: 320, height: 160 }}
                      className="absolute inset-0 z-0"
                    />
                  )}

              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Progress to next stage</span>
                <span>{stageProgress.current}/{stageProgress.target} stars</span>
              </div>
              <Progress value={stageProgress.percentage} className="h-3" />
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
              {categoryStars.map(({
              category,
              stars
            }) => <div key={category} className="text-center p-2 bg-white/50 rounded-lg">
                  <div className="text-sm font-medium">{category}</div>
                  <div className="text-lg font-bold text-family-star">{stars} ⭐</div>
                </div>)}
            </div>

            {/* Active Goal */}
            {activeGoal && <div className="p-3 bg-family-success/10 rounded-lg border border-family-success/20">
                <div className="text-sm font-medium text-family-success">Active Goal</div>
                <div className="text-sm">{activeGoal.current_stars}/{activeGoal.target_stars} stars</div>
                <Progress value={activeGoal.current_stars / activeGoal.target_stars * 100} className="h-2 mt-1" />
                {activeGoal.reward && <div className="text-xs text-muted-foreground mt-1">Reward: {activeGoal.reward}</div>}
              </div>}
          </CardContent>
        </Card>

        {/* Today's Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Tasks
              <Badge variant="secondary">{todaysTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysTasks.length === 0 ? <div className="text-center py-8 text-muted-foreground">
                No tasks for today! Great job staying on top of things! 🎉
              </div> : <div className="space-y-2">
                {todaysTasks.map(task => <div key={`${task.id}-${refreshKey}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{task.name}</div>
                      {task.description && <div className="text-sm text-muted-foreground">{task.description}</div>}
                    </div>
                     <div className="flex items-center gap-2">
                       <Badge variant="outline">{task.starValue} ⭐</Badge>
                       {task.assignedTo === user?.id && <Button onClick={() => handleCompleteTask(task.id)} size="sm" variant="ghost" className="p-2 h-8 w-8 text-family-success hover:text-family-success hover:bg-family-success/10">
                           <CheckCircle className="h-5 w-5" />
                         </Button>}
                     </div>
                  </div>)}
              </div>}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={() => navigate(ROUTES.tasks)} className="bg-primary hover:bg-primary/90 h-14">
            Go to Tasks Page
          </Button>
          <Button onClick={() => setShowAssignTask(true)} variant="outline" className="h-14">
            <Plus className="h-5 w-5 mr-2" />
            Assign a Task
          </Button>
        </div>

        {/* Reset Button */}
        <div className="text-center">
          <Button onClick={handleResetCharacter} variant="destructive" size="sm" className="opacity-70">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Character
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

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        open={showAssignmentModal}
        onOpenChange={closeAssignmentModal}
        task={currentAssignment}
        onTaskResponse={handleTaskResponse}
      />
    </div>;
}