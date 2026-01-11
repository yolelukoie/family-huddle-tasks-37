import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, User, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/hooks/useApp";
import { useTasks } from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";
import { translateTaskName } from "@/lib/translations";
import { Task } from "@/lib/types";
import { format, isToday, isFuture } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

interface TaskAssignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: Task | null;
  onTaskResponse?: (taskId: string, accepted: boolean) => void;
}

export function TaskAssignmentModal({ open, onOpenChange, task, onTaskResponse }: TaskAssignmentModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { getUserProfile } = useApp();
  const { updateTask, deleteTask, ensureCategoryByName } = useTasks();
  const { toast } = useToast();

  if (!task || !user) return null;

  const assignerProfile = getUserProfile(task.assignedBy);
  const assignerName = assignerProfile?.displayName || t('common.someone', 'Someone');

  const familyId = task.familyId;
  if (!familyId) {
    console.error("Missing familyId for task_events insert");
    toast({
      title: t('taskAssignment.cannotNotify'),
      description: t('taskAssignment.familyNotLoaded'),
      variant: "destructive",
    });
    return null;
  }

  const handleAccept = async () => {
    try {
      // Move task to "Assigned" category regardless of due date
      const cat = await ensureCategoryByName("Assigned");

      if (cat) {
        await updateTask(task.id, { categoryId: cat.id });
      }

      // INSERT a notification event for the assigner
      const { error: evErr } = await supabase.from("task_events").insert({
        task_id: task.id,
        family_id: familyId,
        recipient_id: task.assignedBy, // notify the assigner
        actor_id: user!.id, // me, the acceptor/rejector
        event_type: "accepted", // or 'rejected' in the reject handler
        payload: {
          name: task.name,
          stars: task.starValue,
          due_date: task.dueDate,
          actor_name: user!.displayName, // avoid undefined
        },
      });
      if (evErr) {
        console.error("task_events insert failed", evErr);
      }

      if (!evErr) {
        await supabase.functions
          .invoke("send-push", {
            body: {
              recipientId: task.assignedBy, // notify assigner
              title: "Task accepted",
              body: `${(user as any)?.displayName ?? "Someone"} accepted "${task.name}"`,
              data: { type: "accepted", taskId: task.id },
            },
          })
          .catch((e) => console.error("[send-push] invoke failed:", e));
      }

      toast({
        title: t('taskAssignment.accepted'),
        description: t('taskAssignment.acceptedDesc', { taskName: translateTaskName(task.name, t) }),
      });

      onTaskResponse?.(task.id, true);
      onOpenChange(false);
    } catch (error) {
      console.error("Error accepting task:", error);
      toast({
        title: t('taskAssignment.error'),
        description: t('taskAssignment.acceptError'),
        variant: "destructive",
      });
    }
  };

  const handleReject = async () => {
    try {
      // Delete the task since it was rejected
      await deleteTask(task.id);

      // INSERT a notification event for the assigner
      const { error: evErr } = await supabase.from("task_events").insert({
        task_id: task.id,
        family_id: familyId,
        recipient_id: task.assignedBy, // notify the assigner
        actor_id: user!.id, // me, the acceptor/rejector
        event_type: "rejected", // or 'rejected' in the reject handler
        payload: {
          name: task.name,
          stars: task.starValue,
          due_date: task.dueDate,
          actor_name: user!.displayName, // avoid undefined
        },
      });
      if (evErr) {
        console.error("task_events insert failed", evErr);
      }

      if (!evErr) {
        await supabase.functions
          .invoke("send-push", {
            body: {
              recipientId: task.assignedBy, // notify assigner
              title: "Task rejected",
              body: `${(user as any)?.displayName ?? "Someone"} rejected "${task.name}"`,
              data: { type: "rejected", taskId: task.id },
            },
          })
          .catch((e) => console.error("[send-push] invoke failed:", e));
      }

      toast({
        title: t('taskAssignment.rejected'),
        description: t('taskAssignment.rejectedDesc', { taskName: translateTaskName(task.name, t) }),
      });

      onTaskResponse?.(task.id, false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error rejecting task:", error);
      toast({
        title: t('taskAssignment.error'),
        description: t('taskAssignment.rejectError'),
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
            {t('taskAssignment.title')}
          </DialogTitle>
          <DialogDescription>{t('taskAssignment.assignedBy', { name: assignerName })}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Details */}
          <div className="p-4 border rounded-lg space-y-3">
            <div>
              <h3 className="font-semibold text-lg">{translateTaskName(task.name, t)}</h3>
              {task.description && <p className="text-muted-foreground text-sm mt-1">{task.description}</p>}
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="font-medium">{task.starValue} {t('taskAssignment.stars')}</span>
              </div>

              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(task.dueDate), "MMM dd, yyyy")}</span>
              </div>

              {isToday(new Date(task.dueDate)) && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {t('taskAssignment.dueToday')}
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground">{t('taskAssignment.from')}: {assignerName}</div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={handleAccept} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
              {t('taskAssignment.accept')}
            </Button>
            <Button onClick={handleReject} variant="destructive" className="flex-1">
              {t('taskAssignment.reject')}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            {t('taskAssignment.acceptHint')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
