import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { TaskTemplateModal } from './TaskTemplateModal';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import type { TaskCategory, TaskTemplate } from '@/lib/types';

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
  const { templates, addTodayTaskFromTemplate, deleteCategory, deleteTemplate } = useTasks();

  const categoryTemplates = templates.filter(t => t.categoryId === category.id);

  const handleAddToToday = async (template: TaskTemplate) => {
    console.log('🔵 TaskCategorySection: handleAddToToday called with template:', template);
    
    if (!user) {
      console.log('❌ TaskCategorySection: No user found');
      return;
    }
    
    console.log('🔵 TaskCategorySection: Calling addTodayTaskFromTemplate with ID:', template.id);
    const newTask = await addTodayTaskFromTemplate(template.id);
    
    if (newTask) {
      console.log('✅ TaskCategorySection: Task added successfully:', newTask);
      toast({
        title: "Added to Today",
        description: `"${template.name}" has been added to today's tasks.`,
      });
      
      // Trigger refresh in parent component
      onTaskAdded?.();
    } else {
      console.log('❌ TaskCategorySection: Task creation failed');
      toast({
        title: "Error",
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
              <span className="font-medium">{category.name}</span>
              <Badge variant="outline">{categoryTemplates.length} templates</Badge>
            </div>
            {!category.isDefault && !category.isHouseChores && (
              <Button
                variant="ghost"
                size="sm"
                onClick={async (e) => {
                  e.stopPropagation();
                  if (confirm(`Delete "${category.name}" category? This will also delete all templates and tasks in this category.`)) {
                    const success = await deleteCategory(category.id);
                    if (success) {
                      toast({
                        title: "Category deleted",
                        description: `"${category.name}" and all its tasks have been deleted.`,
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
              .map(template => (
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
                    <div
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (confirm('Delete this task template?')) {
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
    </div>
  );
}