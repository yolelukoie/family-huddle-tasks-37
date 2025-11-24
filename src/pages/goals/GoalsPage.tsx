import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useGoals } from '@/hooks/useGoals';
import { useTasks } from '@/hooks/useTasks';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { History, Plus, Trash2 } from 'lucide-react';
import { CreateGoalModal } from '@/components/modals/CreateGoalModal';
import { GoalHistoryModal } from '@/components/modals/GoalHistoryModal';

export default function GoalsPage() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const { activeGoal, completedGoals, deleteGoal } = useGoals();
  const { categories } = useTasks();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Handle loading and missing data states
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
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

  const handleDeleteGoal = async (goalId: string) => {
    if (confirm(t('goals.deleteConfirm'))) {
      await deleteGoal(goalId);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title={t('goals.title')} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{t('goals.personalGoals')}</h1>
            <p className="text-muted-foreground">{t('goals.trackGoals')}</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            {t('goals.history')}
          </Button>
        </div>

        {/* Active Goal */}
        {activeGoal ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('goals.activeGoal')}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGoal(activeGoal.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t('goals.progress')}</span>
                  <span>{activeGoal.currentStars}/{activeGoal.targetStars} {t('main.stars')}</span>
                </div>
                <Progress 
                  value={(activeGoal.currentStars / activeGoal.targetStars) * 100} 
                  className="h-3" 
                />
              </div>
              
              {activeGoal.targetCategories && activeGoal.targetCategories.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">{t('goals.targetCategories')}</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeGoal.targetCategories.map(categoryId => {
                      const category = categories.find(c => c.id === categoryId);
                      return category ? (
                        <Badge key={categoryId} variant="outline">{category.name}</Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {activeGoal.reward && (
                <div>
                  <h4 className="font-medium mb-1">{t('goals.reward')}</h4>
                  <p className="text-muted-foreground">{activeGoal.reward}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">{t('goals.noActiveGoal')}</p>
              <Button onClick={() => setShowCreateGoal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {t('goals.createGoal')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <CreateGoalModal 
        open={showCreateGoal}
        onOpenChange={setShowCreateGoal}
        familyId={activeFamilyId}
        userId={user.id}
      />
      
      <GoalHistoryModal 
        open={showHistory}
        onOpenChange={setShowHistory}
        goals={completedGoals}
      />
    </div>
  );
}