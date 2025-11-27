import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';
import { formatDate } from '@/lib/utils';
import { translateTaskName, translateCategoryName, translateTaskDescription } from '@/lib/translations';

interface TaskHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskHistoryModal({ open, onOpenChange }: TaskHistoryModalProps) {
  const { t } = useTranslation();
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
          <DialogTitle>{t('taskHistory.title')}</DialogTitle>
          <DialogDescription>
            {t('taskHistory.description')}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {completedTasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('taskHistory.noTasks')}
            </div>
          ) : (
            <div className="space-y-3">
              {completedTasks.map(task => {
                const category = categories.find(c => c.id === task.categoryId);
                const translatedTaskName = translateTaskName(task.name, t);
                const translatedCategoryName = category ? translateCategoryName(category.name, t) : '';
                const translatedDescription = translateTaskDescription(task.description, t);
                return (
                  <div key={task.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{translatedTaskName}</h4>
                      <Badge variant="secondary">⭐ {task.starValue}</Badge>
                    </div>
                    
                    {translatedDescription && (
                      <p className="text-sm text-muted-foreground mb-2">{translatedDescription}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{t('taskHistory.category')}: {translatedCategoryName}</span>
                      <span>{t('taskHistory.completed')}: {task.completedAt ? formatDate(task.completedAt) : t('taskHistory.unknown')}</span>
                      <span>{t('taskHistory.due')}: {formatDate(task.dueDate)}</span>
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