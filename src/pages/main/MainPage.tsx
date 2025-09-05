import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useBadges } from '@/hooks/useBadges';
import { useGoals } from '@/hooks/useGoals';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { BadgeDisplay } from '@/components/badges/BadgeDisplay';
import { BadgeCelebration } from '@/components/badges/BadgeCelebration';
import { GoalCelebration } from '@/components/celebrations/GoalCelebration';
import { ROUTES } from '@/lib/constants';
import { getCurrentStage, getStageProgress, getCharacterImagePath, getStageName } from '@/lib/character';
import { storage } from '@/lib/storage';
import { isToday } from '@/lib/utils';
import { AssignTaskModal } from '@/components/modals/AssignTaskModal';
import { Star, Calendar, Plus, RotateCcw, CheckCircle } from 'lucide-react';

export default function MainPage() {
  const { user } = useAuth();
  const { activeFamilyId, getTotalStars, resetCharacterProgress, addStars } = useApp();
  const { unlockedBadges, showBadges, celebration, checkForNewBadges, resetBadgeProgress } = useBadges();
  const { celebration: goalCelebration, updateGoalProgress, completeCelebration } = useGoals();
  const navigate = useNavigate();
  const [showAssignTask, setShowAssignTask] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [previousStars, setPreviousStars] = useState(0);

  if (!user || !activeFamilyId) {
    return null;
  }

  const totalStars = getTotalStars(activeFamilyId);
  const currentStage = getCurrentStage(totalStars);
  const stageProgress = getStageProgress(totalStars);
  const stageName = getStageName(currentStage);
  const characterImagePath = getCharacterImagePath(user.gender, currentStage);

  // Check for newly unlocked badges when stars change
  useEffect(() => {
    if (previousStars !== totalStars) {
      checkForNewBadges(previousStars, totalStars);
      setPreviousStars(totalStars);
    }
  }, [totalStars, previousStars, checkForNewBadges]);

  // Get today's tasks
  const todaysTasks = storage.getTasks(activeFamilyId).filter(task => 
    !task.completed && isToday(task.dueDate)
  );

  // Get active goal
  const activeGoal = storage.getGoals(activeFamilyId, user.id).find(g => !g.completed);

  // Get task categories for star breakdown
  const categories = storage.getTaskCategories(activeFamilyId);
  const completedTasks = storage.getTasks(activeFamilyId).filter(task => 
    task.completed && task.assignedTo === user.id
  );

  const categoryStars = categories.map(category => {
    const categoryTasks = completedTasks.filter(task => task.categoryId === category.id);
    const stars = categoryTasks.reduce((sum, task) => sum + task.starValue, 0);
    return { category: category.name, stars };
  });

  const handleCompleteTask = (taskId: string) => {
    const task = todaysTasks.find(t => t.id === taskId);
    if (!task) return;

    storage.updateTask(taskId, {
      completed: true,
      completedAt: new Date().toISOString(),
    });

    // Add stars if it's the user's task
    if (task.assignedTo === user.id) {
      addStars(activeFamilyId, task.starValue);
      
      // Update goal progress
      updateGoalProgress(task.categoryId, task.starValue);
    }

    // Refresh component
    setRefreshKey(prev => prev + 1);
  };

  const handleResetCharacter = () => {
    if (window.confirm('Are you sure? This will reset your character progress for this family only.')) {
      resetCharacterProgress(activeFamilyId);
      resetBadgeProgress();
      setPreviousStars(0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Family Stars" showBackButton={false} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Greeting */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-family-warm mb-2">
            Hello, {user.displayName}! ✨
          </h1>
        </div>

        {/* Character Block */}
        <Card className="bg-gradient-to-br from-family-warm/10 to-family-celebration/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-family-star" />
              {stageName}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Character Image and Badges */}
            <div className="flex justify-center">
              <div className="relative">
                <img 
                  src={characterImagePath} 
                  alt={`${user.gender} character at ${stageName} stage`}
                  className="w-40 h-40 object-contain"
                  onError={(e) => {
                    // Fallback to emoji if image fails to load
                    const img = e.currentTarget;
                    const fallback = img.nextElementSibling as HTMLElement;
                    img.style.display = 'none';
                    if (fallback) fallback.style.display = 'block';
                  }}
                />
                <span className="text-4xl hidden">👤</span>
                
                {/* Scattered Badges */}
                {showBadges && (
                  <BadgeDisplay badges={unlockedBadges} scattered />
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress to next stage</span>
                <span>{stageProgress.current}/{stageProgress.target} stars</span>
              </div>
              <Progress value={stageProgress.percentage} className="h-3" />
            </div>

            {/* Category Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {categoryStars.map(({ category, stars }) => (
                <div key={category} className="text-center p-2 bg-white/50 rounded-lg">
                  <div className="text-sm font-medium">{category}</div>
                  <div className="text-lg font-bold text-family-star">{stars} ⭐</div>
                </div>
              ))}
            </div>

            {/* Active Goal */}
            {activeGoal && (
              <div className="p-3 bg-family-success/10 rounded-lg border border-family-success/20">
                <div className="text-sm font-medium text-family-success">Active Goal</div>
                <div className="text-sm">{activeGoal.currentStars}/{activeGoal.targetStars} stars</div>
                <Progress 
                  value={(activeGoal.currentStars / activeGoal.targetStars) * 100} 
                  className="h-2 mt-1" 
                />
                {activeGoal.reward && (
                  <div className="text-xs text-muted-foreground mt-1">Reward: {activeGoal.reward}</div>
                )}
              </div>
            )}
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
            {todaysTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No tasks for today! Great job staying on top of things! 🎉
              </div>
            ) : (
              <div className="space-y-2">
                {todaysTasks.map(task => (
                  <div key={`${task.id}-${refreshKey}`} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{task.name}</div>
                      {task.description && (
                        <div className="text-sm text-muted-foreground">{task.description}</div>
                      )}
                    </div>
                     <div className="flex items-center gap-2">
                       <Badge variant="outline">{task.starValue} ⭐</Badge>
                       {task.assignedTo === user.id && (
                         <Button
                           onClick={() => handleCompleteTask(task.id)}
                           size="sm"
                           variant="ghost"
                           className="p-2 h-8 w-8 text-family-success hover:text-family-success hover:bg-family-success/10"
                         >
                           <CheckCircle className="h-5 w-5" />
                         </Button>
                       )}
                     </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={() => navigate(ROUTES.tasks)}
            className="bg-primary hover:bg-primary/90 h-14"
          >
            Go to Tasks Page
          </Button>
          <Button 
            onClick={() => setShowAssignTask(true)}
            variant="outline"
            className="h-14"
          >
            <Plus className="h-5 w-5 mr-2" />
            Assign a Task
          </Button>
        </div>

        {/* Reset Button */}
        <div className="text-center">
          <Button 
            onClick={handleResetCharacter}
            variant="destructive"
            size="sm"
            className="opacity-70"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset Character
          </Button>
        </div>
      </div>

      <AssignTaskModal 
        open={showAssignTask}
        onOpenChange={setShowAssignTask}
      />

      {/* Badge Celebration */}
      {celebration && (
        <BadgeCelebration 
          badge={celebration.badge}
          show={celebration.show}
        />
      )}

      {/* Goal Celebration */}
      {goalCelebration && (
        <GoalCelebration
          goal={goalCelebration.goal}
          show={goalCelebration.show}
          onComplete={completeCelebration}
        />
      )}
    </div>
  );
}