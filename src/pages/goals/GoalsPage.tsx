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
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { History, Plus, Trash2 } from 'lucide-react';
import { CreateGoalModal } from '@/components/modals/CreateGoalModal';
import { GoalHistoryModal } from '@/components/modals/GoalHistoryModal';
import { translateCategoryName } from '@/lib/translations';

export default function GoalsPage() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const { activeGoals, completedGoals, deleteGoal } = useGoals();
  const { categories } = useTasks();
  const { gate } = useFeatureGate();
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

  const handleDeleteGoal = (goalId: string) => {
    gate(() => {
      if (confirm(t('goals.deleteConfirm'))) {
        deleteGoal(goalId);
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={t('goals.title')} />

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[hsl(var(--icon-tint))] to-[hsl(var(--family-celebration))] bg-clip-text text-transparent">{t('goals.personalGoals')}</h1>
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
        <p className="text-muted-foreground -mt-2 text-sm">
          {activeGoals.length === 1
            ? t('goals.activeCount_one', { count: 1 })
            : t('goals.activeCount_other', { count: activeGoals.length })}
        </p>

        {/* Active Goals */}
        {activeGoals.length > 0 ? (
          activeGoals.map(goal => {
            const firstCategoryId = goal.targetCategories?.[0];
            const firstCategory = firstCategoryId ? categories.find((c: any) => c.id === firstCategoryId) : null;
            return (
              <Card accent key={goal.id}>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>
                      {firstCategory
                        ? t('goals.goalInCategory', { category: translateCategoryName(firstCategory.name, t) })
                        : t('goals.activeGoal')}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span>{t('goals.progress')}</span>
                      <Badge variant="warm" className="text-xs">
                        {goal.currentStars}/{goal.targetStars} ⭐
                      </Badge>
                    </div>
                    <Progress
                      value={(goal.currentStars / goal.targetStars) * 100}
                      className="h-2 [&>div]:bg-[hsl(var(--icon-tint))]"
                    />
                  </div>

                  {goal.targetCategories && goal.targetCategories.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">{t('goals.targetCategories')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {goal.targetCategories.map((categoryId: string) => {
                          const category = categories.find((c: any) => c.id === categoryId);
                          return category ? (
                            <Badge key={categoryId} variant="outline">{translateCategoryName(category.name, t)}</Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {goal.reward && (
                    <div>
                      <h4 className="font-medium mb-1">{t('goals.reward')}</h4>
                      <p className="text-muted-foreground">{goal.reward}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card accent>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">{t('goals.noActiveGoal')}</p>
            </CardContent>
          </Card>
        )}

        {/* Create Goal button — hidden when all category slots AND general goal slot are taken */}
        {(() => {
          const categoriesWithActiveGoals = new Set(
            activeGoals.flatMap(g => g.targetCategories || [])
          );
          const hasGeneralGoal = activeGoals.some(g => !g.targetCategories || g.targetCategories.length === 0);
          const allCategorySlotsTaken = categories.length > 0 && categories.every((c: any) => categoriesWithActiveGoals.has(c.id));
          const allSlotsTaken = allCategorySlotsTaken && hasGeneralGoal;
          return !allSlotsTaken ? (
            <Button
              onClick={() => gate(() => setShowCreateGoal(true))}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('goals.createGoal')}
            </Button>
          ) : null;
        })()}
      </div>

      <CreateGoalModal
        open={showCreateGoal}
        onOpenChange={setShowCreateGoal}
        familyId={activeFamilyId}
        userId={user.id}
        activeGoals={activeGoals}
      />

      <GoalHistoryModal
        open={showHistory}
        onOpenChange={setShowHistory}
        goals={completedGoals}
      />
    </div>
  );
}
