import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, User, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { Task } from '@/lib/types';
import { format, isToday, isFuture } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface TaskAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onTaskResponse?: (taskId: string, accepted: boolean) => void;
}

export function TaskAssignmentModal({ open, onOpenChange, task, onTaskResponse }: TaskAssignmentModalProps) {
  const { user } = useAuth();
  const { getUserProfile } = useApp();
  const { updateTask, deleteTask, ensureCategoryByName } = useTasks();
  const { toast } = useToast();
  
  if (!task || !user) return null;

  const assignerProfile = getUserProfile(task.assignedBy);
  const assignerName = assignerProfile?.displayName || 'Someone';

  const handleAccept = async () => {
    try {
      // Move task to "Assigned" category regardless of due date
      const cat = await ensureCategoryByName("Assigned");
      
      if (cat) {
        await updateTask(task.id, { categoryId: cat.id });
      }

      // INSERT a notification event for the assigner
      const { error: evErr } = await (supabase as any)
        .from('task_events')
        .insert([{
          task_id: task.id,
          family_id: task.familyId,
          recipient_id: task.assignedBy,  // the assigner should be notified
          actor_id: user.id,              // the acceptor/rejector
          event_type: 'accepted',
          payload: { 
            name: task.name, 
            stars: task.starValue, 
            due_date: task.dueDate, 
            actor_name: user.displayName ?? null 
          }
        }])
        .select()
        .single();

      if (evErr) {
        console.error('task_events insert failed', evErr);
      }

      toast({
        title: "Task accepted!",
        description: `"${task.name}" has been added to your tasks.`,
      });

      onTaskResponse?.(task.id, true);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error accepting task:', error);
      toast({
        title: "Error",
        description: "Failed to accept the task. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    try {
      // Delete the task since it was rejected
      await deleteTask(task.id);

      // INSERT a notification event for the assigner
      const { error: evErr } = await (supabase as any)
        .from('task_events')
        .insert([{
          task_id: task.id,
          family_id: task.familyId,
          recipient_id: task.assignedBy,  // the assigner should be notified
          actor_id: user.id,              // the acceptor/rejector
          event_type: 'rejected',
          payload: { 
            name: task.name, 
            stars: task.starValue, 
            due_date: task.dueDate, 
            actor_name: user.displayName ?? null 
          }
        }])
        .select()
        .single();

      if (evErr) {
        console.error('task_events insert failed', evErr);
      }

      toast({
        title: "Task rejected",
        description: `"${task.name}" has been rejected.`,
      });

      onTaskResponse?.(task.id, false);
      onOpenChange(false);
      
    } catch (error) {
      console.error('Error rejecting task:', error);
      toast({
        title: "Error", 
        description: "Failed to reject the task. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            New Task Assignment
          </DialogTitle>
          <DialogDescription>
            {assignerName} has assigned you a new task
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Details */}
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{task.name}</h3>
              {task.description && (
                <p className="text-muted-foreground text-sm mt-1">{task.description}</p>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{task.starValue} stars</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(task.dueDate), 'MMM dd, yyyy')}</span>
              </div>

              {isToday(new Date(task.dueDate)) && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Due Today
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              From: {assignerName}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button 
              onClick={handleAccept}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Accept
            </Button>
            <Button 
              onClick={handleReject}
              variant="destructive"
              className="flex-1"
            >
              Reject
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Accepting will add this task to your task list. Rejecting will decline the assignment.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
