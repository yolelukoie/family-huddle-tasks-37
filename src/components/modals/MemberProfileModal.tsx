import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar } from 'lucide-react';
import { DraggableBadgeDisplay } from '@/components/badges/DraggableBadgeDisplay';
import { getCurrentStageBadges } from '@/lib/badges';
import { getCurrentStage, getStageProgress, getCharacterImagePath, getStageName } from '@/lib/character';
import { storage } from '@/lib/storage';
import { isToday } from '@/lib/utils';
import { User, UserFamily } from '@/lib/types';

interface MemberProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: UserFamily;
  memberProfile?: User;
  familyId: string;
}

export function MemberProfileModal({ open, onOpenChange, member, memberProfile, familyId }: MemberProfileModalProps) {
  const totalStars = member.totalStars;
  const currentStage = getCurrentStage(totalStars);
  const stageProgress = getStageProgress(totalStars);
  const stageName = getStageName(currentStage);
  const characterImagePath = getCharacterImagePath(memberProfile?.gender || 'female', currentStage);
  const unlockedBadges = getCurrentStageBadges(totalStars);
  
  // Get member's tasks (completed and today's active)
  const allTasks = storage.getTasks(familyId).filter(task => task.assignedTo === member.userId);
  const todaysTasks = allTasks.filter(task => !task.completed && isToday(task.dueDate));
  const completedTasks = allTasks.filter(task => task.completed);
  
  // Get member's active goal
  const activeGoal = storage.getGoals(familyId, member.userId).find(g => !g.completed);
  
  // Get task categories for star breakdown
  const categories = storage.getTaskCategories(familyId);
  const categoryStars = categories.map(category => {
    const categoryTasks = completedTasks.filter(task => task.categoryId === category.id);
    const stars = categoryTasks.reduce((sum, task) => sum + task.starValue, 0);
    return {
      category: category.name,
      stars
    };
  });

  const displayName = memberProfile?.displayName || `Family Member`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            {displayName}'s Profile
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Character Block */}
          <Card className="bg-gradient-to-br from-family-warm/10 to-family-celebration/10">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Star className="h-5 w-5 text-family-star" />
                {stageName}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Character Image with Draggable Badges */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <img 
                    src={characterImagePath} 
                    alt={`${memberProfile?.gender || 'character'} character at ${stageName} stage`} 
                    className="w-32 h-32 object-contain" 
                    onError={(e) => {
                      // Fallback to emoji if image fails to load
                      const img = e.currentTarget;
                      const fallback = img.nextElementSibling as HTMLElement;
                      img.style.display = 'none';
                      if (fallback) fallback.style.display = 'block';
                    }} 
                  />
                  <span className="text-3xl hidden">👤</span>
                  
                  {/* Draggable Badges */}
                  {unlockedBadges.length > 0 && (
                    <DraggableBadgeDisplay 
                      badges={unlockedBadges} 
                      familyId={familyId} 
                      userId={member.userId}
                      containerBounds={{ width: 128, height: 128 }}
                      className="absolute inset-0"
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
                  <Progress value={(activeGoal.currentStars / activeGoal.targetStars) * 100} className="h-2 mt-1" />
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
                <div className="text-center py-4 text-muted-foreground">
                  No tasks for today! 
                </div>
              ) : (
                <div className="space-y-2">
                  {todaysTasks.map(task => (
                    <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{task.name}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground">{task.description}</div>
                        )}
                      </div>
                      <Badge variant="outline">{task.starValue} ⭐</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{totalStars}</div>
                <div className="text-sm text-muted-foreground">Total Stars</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{completedTasks.length}</div>
                <div className="text-sm text-muted-foreground">Tasks Completed</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}