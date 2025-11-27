import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { TaskTemplateModal } from './TaskTemplateModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { translateCategoryName, translateTaskName, translateTaskDescription } from '@/lib/translations';
import type { TaskCategory, TaskTemplate } from '@/lib/types';

interface TaskCategorySectionProps {
  category: TaskCategory;
  familyId: string;
  onTaskAdded?: () => void;
}

export function TaskCategorySection({ category, familyId, onTaskAdded }: TaskCategorySectionProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(category.isHouseChores); // House chores open by default
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { templates, addTodayTaskFromTemplate, deleteCategory, deleteTemplate } = useTasks();

  const categoryTemplates = templates.filter(t => t.categoryId === category.id);
  
  // Translate category name
  const translatedCategoryName = translateCategoryName(category.name, t);

  const handleAddToToday = async (template: TaskTemplate) => {
    if (!user) return;
    
    const translatedTaskName = translateTaskName(template.name, t);
    const newTask = await addTodayTaskFromTemplate(template.id);
    
    if (newTask) {
      toast({
        title: t('tasks.addToToday'),
        description: `"${translatedTaskName}" ${t('tasks.addToTodayDesc')}`,
      });
      
      // Trigger refresh in parent component
      onTaskAdded?.();
    } else {
      toast({
        title: t('family.error'),
        description: "Failed to add task to today. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="group">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-3 h-auto">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium">{translatedCategoryName}</span>
              <Badge variant="outline">{categoryTemplates.length} {t('tasks.templates')}</Badge>
            </div>
            {!category.isDefault && !category.isHouseChores && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(t('tasks.deleteCategory'))) {
                    const success = await deleteCategory(category.id);
                    if (success) {
                      toast({
                        title: t('tasks.categoryDeleted'),
                        description: `"${translatedCategoryName}" ${t('tasks.deleteCategorySuccess')}`,
                      });
                      onTaskAdded?.(); // Refresh parent
                    }
                  }
                }}
                className="h-6 w-6 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2 pt-2">
          <div className="ml-7 space-y-2">
            {categoryTemplates
              .filter(template => template.name !== 'test') // Filter out the test task
              .map(template => {
                const translatedTaskName = translateTaskName(template.name, t);
                const translatedDescription = translateTaskDescription(template.description, t);
                return (
              <div 
                key={template.id} 
                className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleAddToToday(template)}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{translatedTaskName}</div>
                  {translatedDescription && (
                  <div className="text-xs text-muted-foreground">{translatedDescription}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="theme" className="text-xs">
                    {template.starValue} ⭐
                  </Badge>
                  {!category.isHouseChores && template.isDeletable && (
                    <div
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm(t('tasks.deleteTemplate'))) {
                          const success = await deleteTemplate(template.id);
                          if (success) {
                            onTaskAdded?.(); // Refresh parent
                          }
                        }
                      }}
                      className="h-6 w-6 p-1 text-destructive hover:text-destructive hover:bg-destructive/10 rounded cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </div>
                  )}
                </div>
              </div>
                );
              })}
            
            <Button
              variant="theme"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
              className="w-full"
            >
              <Plus className="h-3 w-3 mr-2" />
              {t('tasks.addTaskTemplate')}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <TaskTemplateModal
        open={showTemplateModal}
        onOpenChange={setShowTemplateModal}
        category={category}
        familyId={familyId}
        onTemplateCreated={() => onTaskAdded?.()}
      />
    </div>
  );
}