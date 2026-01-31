import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import type { TaskCategory } from '@/lib/types';

const taskTemplateSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  starValue: z.coerce.number().min(0).max(20, 'Star value must be between 0 and 20'),
});

type TaskTemplateForm = z.infer<typeof taskTemplateSchema>;

interface TaskTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: TaskCategory;
  familyId: string;
  onTemplateCreated?: () => void;
}

export function TaskTemplateModal({ open, onOpenChange, category, familyId, onTemplateCreated }: TaskTemplateModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { addTemplate } = useTasks();

  const form = useForm<TaskTemplateForm>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      starValue: 1,
    },
  });

  if (!user) return null;

  // All users can edit star values now
  const canEditStars = true;

  const onSubmit = async (data: TaskTemplateForm) => {
    if (!user) return;

    const result = await addTemplate({
      categoryId: category.id,
      familyId: familyId,
      name: data.name,
      description: data.description || '',
      starValue: data.starValue,
      isDefault: false,
      isDeletable: true,
      createdBy: user.id,
    });
    
    if (result) {
      toast({
        title: t('tasks.taskTemplateCreated'),
        description: `"${data.name}" ${t('tasks.addedToCategory')} ${category.name}.`,
      });

      form.reset();
      onOpenChange(false);
      onTemplateCreated?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tasks.addTaskTemplate')}</DialogTitle>
          <DialogDescription>
            {t('tasks.createTemplateFor')} {category.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.taskName')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('tasks.taskNamePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.description')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('tasks.descriptionPlaceholder')}
                      rows={2}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="starValue"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('tasks.starValue')}</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min="0" 
                      max="20"
                      disabled={!canEditStars}
                      {...field} 
                    />
                  </FormControl>
                  {!canEditStars && (
                    <p className="text-xs text-muted-foreground">
                      {t('tasks.starValueRestriction')}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-family-warm hover:bg-family-warm/90">
                {t('tasks.createTemplate')}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('family.cancel')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}