import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const assignTaskSchema = z.object({
  name: z.string().min(1, 'Task name is required'),
  description: z.string().optional(),
  assignedTo: z.string().min(1, 'Please select who to assign this task to'),
  dueDate: z.string().min(1, 'Due date is required'),
  starValue: z.coerce.number().min(0).max(20, 'Star value must be between 0 and 20'),
  categoryId: z.string().min(1, 'Please select a category'),
});

type AssignTaskForm = z.infer<typeof assignTaskSchema>;

interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskAssigned?: () => void;
}

export function AssignTaskModal({ open, onOpenChange, onTaskAssigned }: AssignTaskModalProps) {
  const { user } = useAuth();
  const { activeFamilyId, getFamilyMembers } = useApp();
  const { toast } = useToast();

  const form = useForm<AssignTaskForm>({
    resolver: zodResolver(assignTaskSchema),
    defaultValues: {
      starValue: 1,
    },
  });

  if (!user || !activeFamilyId) return null;

  const familyMembers = getFamilyMembers(activeFamilyId);
  const categories = storage.getTaskCategories(activeFamilyId);

  // Check if user is 18+ for star value editing
  const canEditStars = user.age >= 18;

  const onSubmit = (data: AssignTaskForm) => {
    const task = {
      id: generateId(), // Generate UUID for local storage compatibility
      familyId: activeFamilyId,
      name: data.name,
      description: data.description,
      assignedTo: data.assignedTo,
      assignedBy: user.id,
      dueDate: data.dueDate,
      starValue: data.starValue,
      completed: false,
      categoryId: data.categoryId,
    };

    storage.addTask(task);
    
    toast({
      title: "Task assigned!",
      description: `"${data.name}" has been assigned successfully.`,
    });

    form.reset();
    onOpenChange(false);
    
    // Trigger refresh in parent component
    if (onTaskAssigned) {
      onTaskAssigned();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign a Task</DialogTitle>
          <DialogDescription>
            Create and assign a new task to a family member
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assign To</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select person" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={user.id}>Myself</SelectItem>
                        {familyMembers
                          .filter(member => member.userId !== user.id)
                          .map(member => (
                            <SelectItem key={member.userId} value={member.userId}>
                              Family Member {member.userId.slice(-4)}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="starValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stars (0-20)</FormLabel>
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
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1 bg-family-warm hover:bg-family-warm/90">
                Assign Task
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
