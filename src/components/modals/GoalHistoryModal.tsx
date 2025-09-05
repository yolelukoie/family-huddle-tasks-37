import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Goal } from '@/lib/types';

interface GoalHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goals: Goal[];
}

export function GoalHistoryModal({ open, onOpenChange, goals }: GoalHistoryModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Goal History</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {goals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No completed goals yet
            </p>
          ) : (
            goals.map(goal => (
              <div key={goal.id} className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Target: {goal.targetStars} stars</span>
                  <Badge variant="default">Completed</Badge>
                </div>
                
                {goal.reward && (
                  <div>
                    <span className="text-sm font-medium">Reward: </span>
                    <span className="text-sm text-muted-foreground">{goal.reward}</span>
                  </div>
                )}
                
                {goal.completedAt && (
                  <div className="text-xs text-muted-foreground">
                    Completed: {formatDate(goal.completedAt)}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}