import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { storage } from '@/lib/storage';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { History, Plus, Trash2 } from 'lucide-react';
import { CreateGoalModal } from '@/components/modals/CreateGoalModal';
import { GoalHistoryModal } from '@/components/modals/GoalHistoryModal';

export default function GoalsPage() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const [showCreateGoal, setShowCreateGoal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  if (!user || !activeFamilyId) return null;

  const goals = storage.getGoals(activeFamilyId, user.id);
  const activeGoal = goals.find(g => !g.completed);
  const completedGoals = goals.filter(g => g.completed);

  const handleDeleteGoal = (goalId: string) => {
    if (confirm('Are you sure you want to delete this goal?')) {
      storage.deleteGoal(goalId);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Goals" />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Personal Goals</h1>
            <p className="text-muted-foreground">Set and track your star-earning goals</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2"
          >
            <History className="h-4 w-4" />
            History
          </Button>
        </div>

        {/* Active Goal */}
        {activeGoal ? (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Active Goal</CardTitle>
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
                  <span>Progress</span>
                  <span>{activeGoal.currentStars}/{activeGoal.targetStars} stars</span>
                </div>
                <Progress 
                  value={(activeGoal.currentStars / activeGoal.targetStars) * 100} 
                  className="h-3" 
                />
              </div>
              
              {activeGoal.targetCategories && activeGoal.targetCategories.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Target Categories:</h4>
                  <div className="flex flex-wrap gap-2">
                    {activeGoal.targetCategories.map(categoryId => {
                      const category = storage.getTaskCategories(activeFamilyId).find(c => c.id === categoryId);
                      return category ? (
                        <Badge key={categoryId} variant="outline">{category.name}</Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              {activeGoal.reward && (
                <div>
                  <h4 className="font-medium mb-1">Reward:</h4>
                  <p className="text-muted-foreground">{activeGoal.reward}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground mb-4">No active goal set</p>
              <Button onClick={() => setShowCreateGoal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Goal
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