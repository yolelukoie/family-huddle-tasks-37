import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
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
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<TaskTemplateForm>({
    resolver: zodResolver(taskTemplateSchema),
    defaultValues: {
      starValue: 1,
    },
  });

  if (!user) return null;

  // Check if user is 18+ for star value editing
  const canEditStars = user.age >= 18;

  const onSubmit = (data: TaskTemplateForm) => {
    const template = {
      id: generateId(), // Generate UUID for local storage compatibility
      categoryId: category.id,
      familyId: familyId,
      name: data.name,
      description: data.description,
      starValue: data.starValue,
      isDefault: false,
      isDeletable: true,
      createdBy: user.id,
    };

    storage.addTaskTemplate(template);
    
    toast({
      title: "Task template created!",
      description: `"${data.name}" has been added to ${category.name}.`,
    });

    form.reset();
    onOpenChange(false);
    onTemplateCreated?.(); // Refresh parent instead of reload
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Task Template</DialogTitle>
          <DialogDescription>
            Create a reusable task template for {category.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Name</FormLabel>
                  <FormControl>
                    <Input placeholder="What needs to be done?" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about the task..."
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
                  <FormLabel>Star Value (0-20)</FormLabel>
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
                      Only 18+ users can edit star values
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-family-warm hover:bg-family-warm/90">
                Create Template
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}