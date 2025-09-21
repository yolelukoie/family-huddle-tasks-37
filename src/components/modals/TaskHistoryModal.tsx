import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';
import { formatDate } from '@/lib/utils';

interface TaskHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskHistoryModal({ open, onOpenChange }: TaskHistoryModalProps) {
  const { activeFamilyId } = useApp();
  const { tasks, categories } = useTasks();

  if (!activeFamilyId) return null;

  const completedTasks = tasks
    .filter(task => task.completed)
    .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Completed Tasks History</DialogTitle>
          <DialogDescription>
            All tasks that have been completed in this family
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {completedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed tasks yet. Get started by completing some tasks!
            </div>
          ) : (
            <div className="space-y-3">
              {completedTasks.map(task => {
                const category = categories.find(c => c.id === task.categoryId);
                return (
                  <div key={task.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{task.name}</h4>
                      <Badge variant="secondary">⭐ {task.starValue}</Badge>
                    </div>
                    
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Category: {category?.name}</span>
                      <span>Completed: {task.completedAt ? formatDate(task.completedAt) : 'Unknown'}</span>
                      <span>Due: {formatDate(task.dueDate)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}