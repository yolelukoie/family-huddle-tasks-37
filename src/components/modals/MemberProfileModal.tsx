import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Star, Calendar } from 'lucide-react';
import { DraggableBadgeDisplay } from '@/components/badges/DraggableBadgeDisplay';
import { getCurrentStageBadges } from '@/lib/badges';
import { getCurrentStage, getStageProgress, getCharacterImagePath, getStageName } from '@/lib/character';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
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
  const { tasks } = useTasks();
  const { goals } = useGoals();
  const totalStars = member.totalStars;
  const currentStage = getCurrentStage(totalStars);
  const stageProgress = getStageProgress(totalStars);
  const stageName = getStageName(currentStage);
  const characterImagePath = getCharacterImagePath(memberProfile?.gender || 'female', currentStage);
  const unlockedBadges = getCurrentStageBadges(totalStars);
  
  // Get member's tasks for today from context
  const allTasks = tasks.filter(task => task.assignedTo === member.userId && task.familyId === familyId);
  const todaysTasks = allTasks.filter(task => !task.completed && isToday(task.dueDate));
  
  // Get member's active goal from context
  const activeGoal = goals.find(g => !g.completed && g.userId === member.userId && g.familyId === familyId);

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
                <div className="relative w-64 h-32 overflow-visible">
                  {/* Character Image Container */}
                  <div className="absolute left-1/2 transform -translate-x-1/2 w-32 h-32">
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
                  </div>
                  
                  {/* Draggable Badges */}
                  {unlockedBadges.length > 0 && (
                    <DraggableBadgeDisplay 
                      badges={unlockedBadges} 
                      familyId={familyId} 
                      userId={member.userId}
                      containerBounds={{ width: 256, height: 128 }}
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


              {/* Active Goal */}
              {activeGoal && (
                <div className="mb-4">
                  <div className="p-3 bg-family-success/10 rounded-lg border border-family-success/20">
                    <div className="text-sm font-medium text-family-success mb-1">Active Goal</div>
                    <div className="text-sm mb-2">{activeGoal.currentStars}/{activeGoal.targetStars} stars</div>
                    <Progress value={(activeGoal.currentStars / activeGoal.targetStars) * 100} className="h-2" />
                    {activeGoal.reward && (
                      <div className="text-xs text-muted-foreground mt-1">Reward: {activeGoal.reward}</div>
                    )}
                  </div>
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

        </div>
      </DialogContent>
    </Dialog>
  );
}