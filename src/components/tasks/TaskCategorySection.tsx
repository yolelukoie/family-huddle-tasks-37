import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, ChevronRight, Plus, Trash2, MoreVertical, Flag, Loader2 } from 'lucide-react';
import { TaskTemplateModal } from './TaskTemplateModal';
import { ReportContentModal } from '@/components/modals/ReportContentModal';
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
  const [isOpen, setIsOpen] = useState(category.isHouseChores);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<TaskTemplate | null>(null);
  const [showDeleteCategoryDialog, setShowDeleteCategoryDialog] = useState(false);
  const [showDeleteTemplateDialog, setShowDeleteTemplateDialog] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { templates, addTodayTaskFromTemplate, deleteCategory, deleteTemplate } = useTasks();

  const categoryTemplates = templates.filter(t => t.categoryId === category.id);
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
      onTaskAdded?.();
    } else {
      toast({
        title: t('family.error'),
        description: "Failed to add task to today. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async () => {
    setIsDeleting(true);
    try {
      const success = await deleteCategory(category.id);
      if (success) {
        toast({
          title: t('tasks.categoryDeleted'),
          description: `"${translatedCategoryName}" ${t('tasks.deleteCategorySuccess')}`,
        });
        onTaskAdded?.();
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteCategoryDialog(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    setIsDeleting(true);
    try {
      const success = await deleteTemplate(templateId);
      if (success) {
        onTaskAdded?.();
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteTemplateDialog(null);
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteCategoryDialog(true);
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
              .filter(template => template.name !== 'test')
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
                      <Badge variant="warm" className="text-xs">
                        {template.starValue} ⭐
                      </Badge>
                      {!template.isDefault && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <div className="h-6 w-6 p-1 hover:bg-muted rounded cursor-pointer flex items-center justify-center">
                              <MoreVertical className="h-3 w-3" />
                            </div>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            {template.isDeletable && (
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setShowDeleteTemplateDialog(template.id)}
                              >
                                <Trash2 className="h-3 w-3 mr-2" />
                                {t('common.delete')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => setReportTarget(template)}>
                              <Flag className="h-3 w-3 mr-2" />
                              {t('common.report')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <ReportContentModal
        open={!!reportTarget}
        onOpenChange={(open) => !open && setReportTarget(null)}
        contentId={reportTarget?.id || ''}
        contentType="task_template"
        familyId={familyId}
        contentName={reportTarget?.name || ''}
        contentDescription={reportTarget?.description || ''}
        createdBy={reportTarget?.createdBy || ''}
        onReported={() => {
          setReportTarget(null);
          onTaskAdded?.();
        }}
      />

      {/* Delete Category Confirmation Dialog */}
      <AlertDialog open={showDeleteCategoryDialog} onOpenChange={setShowDeleteCategoryDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.deleteCategoryTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('common.deleteCategoryDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.delete')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Template Confirmation Dialog */}
      <AlertDialog open={!!showDeleteTemplateDialog} onOpenChange={(open) => !open && setShowDeleteTemplateDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('tasks.deleteTemplate')}</AlertDialogTitle>
            <AlertDialogDescription>{t('tasks.deleteCategory')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => showDeleteTemplateDialog && handleDeleteTemplate(showDeleteTemplateDialog)}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.delete')}
                </>
              ) : (
                t('common.delete')
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}