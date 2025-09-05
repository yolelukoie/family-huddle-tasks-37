import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { storage } from '@/lib/storage';
import { TaskTemplateModal } from './TaskTemplateModal';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/hooks/useApp';
import type { TaskCategory, TaskTemplate, Task } from '@/lib/types';

interface TaskCategorySectionProps {
  category: TaskCategory;
  familyId: string;
  onTaskAdded?: () => void;
}

export function TaskCategorySection({ category, familyId, onTaskAdded }: TaskCategorySectionProps) {
  const [isOpen, setIsOpen] = useState(category.isHouseChores); // House chores open by default
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const templates = storage.getTaskTemplates(familyId, category.id);

  const handleAddToToday = (template: TaskTemplate) => {
    if (!user) return;
    
    // Create a new task from the template
    const today = new Date();
    today.setHours(23, 59, 59, 999); // Set to end of day

    const newTask: Task = {
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: template.name,
      description: template.description,
      starValue: template.starValue,
      dueDate: today.toISOString(),
      categoryId: template.categoryId,
      familyId: template.familyId,
      assignedTo: user.id, // Assign to current user
      assignedBy: user.id, // User added it themselves
      completed: false
    };

    storage.addTask(newTask);
    toast({
      title: "Added to Today",
      description: `"${template.name}" has been added to today's tasks.`,
    });
    
    // Trigger refresh in parent component
    onTaskAdded?.();
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-3 h-auto">
            <div className="flex items-center gap-3">
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              <span className="font-medium">{category.name}</span>
              <Badge variant="outline">{templates.length} templates</Badge>
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-2 pt-2">
          <div className="ml-7 space-y-2">
            {templates.map(template => (
              <div 
                key={template.id} 
                className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleAddToToday(template)}
              >
                <div className="flex-1">
                  <div className="font-medium text-sm">{template.name}</div>
                  {template.description && (
                  <div className="text-xs text-muted-foreground">{template.description}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {template.starValue} ⭐
                  </Badge>
                  {!category.isHouseChores && template.isDeletable && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm('Delete this task template?')) {
                          storage.deleteTaskTemplate(template.id);
                          onTaskAdded?.(); // Refresh parent
                        }
                      }}
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTemplateModal(true)}
              className="w-full"
            >
              <Plus className="h-3 w-3 mr-2" />
              Add Task Template
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
    </>
  );
}