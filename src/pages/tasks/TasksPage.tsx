import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { useCelebrations } from '@/hooks/useCelebrations';
import { isToday, isFuture, formatDate } from '@/lib/utils';
import { TaskHistoryModal } from '@/components/modals/TaskHistoryModal';
import { AssignTaskModal } from '@/components/modals/AssignTaskModal';
import { TaskCategorySection } from '@/components/tasks/TaskCategorySection';
import { BadgeCelebration } from '@/components/badges/BadgeCelebration';
import { GoalCelebration } from '@/components/celebrations/GoalCelebration';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { History, Plus, CheckCircle } from 'lucide-react';

export default function TasksPage() {
  const { user } = useAuth();
  const { activeFamilyId, addStars } = useApp();
  const { updateGoalProgress } = useGoals();
  const { tasks, categories, updateTask, addCategory } = useTasks();
  const { currentCelebration, completeCelebration } = useCelebrations();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);
  const [showAssignTask, setShowAssignTask] = useState(false);

  // Handle loading and missing data states
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('tasks.loadingUserData')}</p>
        </div>
      </div>
    );
  }

  if (!activeFamilyId) {
    // User exists but has no active family - redirect to onboarding to complete family setup
    setTimeout(() => navigate('/onboarding', { replace: true }), 0);
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('tasks.settingUpFamily')}</p>
        </div>
      </div>
    );
  }

  const todaysTasks = tasks.filter(task => !task.completed && isToday(task.dueDate) && task.assignedTo === user.id);
  const upcomingTasks = tasks.filter(task => !task.completed && isFuture(task.dueDate) && task.assignedTo === user.id);

  const handleCompleteTask = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    await updateTask(taskId, {
      completed: true,
      completedAt: new Date().toISOString(),
    });

    // Add stars if it's the user's task
    if (task.assignedTo === user.id && activeFamilyId) {
      addStars(activeFamilyId, task.starValue);
      
      // Update goal progress
      updateGoalProgress(task.categoryId, task.starValue);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title={t('tasks.title')} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header with History Button */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t('tasks.familyTasks')}</h1>
            <p className="text-muted-foreground">{t('tasks.manageTasks')}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            {t('tasks.history')}
          </Button>
        </div>

        {/* Task Tabs */}
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="today" className="flex items-center gap-2">
              {t('tasks.today')}
              <Badge variant="secondary">{todaysTasks.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center gap-2">
              {t('tasks.upcoming')}
              <Badge variant="secondary">{upcomingTasks.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            {todaysTasks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">{t('tasks.noTasksToday')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {todaysTasks.map(task => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    onComplete={handleCompleteTask}
                    currentUserId={user.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingTasks.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <p className="text-muted-foreground">{t('tasks.noUpcomingTasks')}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {upcomingTasks
                  .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                  .map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onComplete={handleCompleteTask}
                      currentUserId={user.id}
                    />
                  ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Categories Section */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{t('tasks.categories')}</CardTitle>
              <Button
                onClick={async () => {
                  const name = prompt(t('tasks.enterCategoryName'));
                  if (name && name.trim() && activeFamilyId) {
                    await addCategory({
                      name: name.trim(),
                      familyId: activeFamilyId,
                      isHouseChores: false,
                      isDefault: false,
                      order: Date.now()
                    });
                  }
                }}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('tasks.addCategory')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {categories
              .filter(category => category.name !== 'Assigned') // Hide system category
              .map(category => (
                <TaskCategorySection 
                  key={category.id} 
                  category={category}
                  familyId={activeFamilyId}
                />
              ))}
          </CardContent>
        </Card>

        {/* Assign Task Button */}
        <div className="text-center">
          <Button 
            onClick={() => setShowAssignTask(true)}
            className="bg-family-warm hover:bg-family-warm/90"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            {t('main.assignTask')}
          </Button>
        </div>
      </div>

      <TaskHistoryModal 
        open={showHistory}
        onOpenChange={setShowHistory}
      />
      
      <AssignTaskModal 
        open={showAssignTask}
        onOpenChange={setShowAssignTask}
      />

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
    </div>
  );
}

interface TaskItemProps {
  task: any;
  onComplete: (taskId: string) => void;
  currentUserId: string;
}

function TaskItem({ task, onComplete, currentUserId }: TaskItemProps) {
  const { categories } = useTasks();
  const { t } = useTranslation();
  const category = categories.find(c => c.id === task.categoryId);
  
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium">{task.name}</h3>
              <Badge variant="outline" className="text-xs">
                {category?.name}
              </Badge>
            </div>
            
            {task.description && (
              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
            )}
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{t('tasks.due')}: {formatDate(task.dueDate)}</span>
              <span>⭐ {task.starValue} {t('main.stars')}</span>
              <span>
                {task.assignedTo === currentUserId ? t('tasks.assignedToYou') : t('tasks.assignedToMember')}
              </span>
            </div>
          </div>

          {task.assignedTo === currentUserId && (
            <Button
              onClick={() => onComplete(task.id)}
              size="sm"
              variant="ghost"
              className="p-2 h-8 w-8 text-family-success hover:text-family-success hover:bg-family-success/10"
            >
              <CheckCircle className="h-5 w-5" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}