import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, User, Calendar, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/hooks/useApp";
import { useToast } from "@/hooks/use-toast";
import { translateTaskName } from "@/lib/translations";
import { Task } from "@/lib/types";
import { format, isToday } from "date-fns";
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
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!task || !user) return null;

  if (task.assignedTo !== user.id) {
    console.warn('[TaskAssignmentModal] User is not the assignee, not rendering');
    return null;
  }

  if (!task.familyId) {
    console.error('[TaskAssignmentModal] task.familyId is missing, cannot render');
    return null;
  }

  const assignerProfile = getUserProfile(task.assignedBy);
  const assignerName = assignerProfile?.displayName || t('common.someone', 'Someone');
  const familyId = task.familyId;

  // Direct Supabase: find or create "Assigned" category for this family
  const findOrCreateAssignedCategory = async (): Promise<string | null> => {
    console.log('[TaskAssignmentModal] findOrCreateAssignedCategory for family:', familyId);
    try {
      const { data: existing } = await supabase
        .from('task_categories')
        .select('id')
        .eq('family_id', familyId)
        .ilike('name', 'assigned')
        .limit(1)
        .maybeSingle();

      if (existing) return existing.id;

      // Create it
      const { data: created, error } = await supabase
        .from('task_categories')
        .insert({ name: 'Assigned', family_id: familyId, is_default: true, order_index: 0 })
        .select('id')
        .single();

      if (error) {
        console.error('[TaskAssignmentModal] Failed to create Assigned category:', JSON.stringify(error));
        return null;
      }
      return created.id;
    } catch (e) {
      console.error('[TaskAssignmentModal] findOrCreateAssignedCategory threw:', String(e));
      return null;
    }
  };

  const handleAccept = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    console.log('[TaskAssignmentModal] ACCEPT CLICK', { taskId: task.id, familyId, userId: user.id });

    try {
      // 1) Find/create "Assigned" category
      const categoryId = await findOrCreateAssignedCategory();
      console.log('[TaskAssignmentModal] Category resolved:', categoryId);

      // 2) Direct update with assignee guard
      const patch: any = { status: 'active' };
      if (categoryId) patch.category_id = categoryId;

      console.log('[TaskAssignmentModal] Updating task...');
      const { data: updated, error: updateErr } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', task.id)
        .eq('assigned_to', user.id)
        .select('id')
        .maybeSingle();

      if (updateErr) {
        console.error('[TaskAssignmentModal] Update error:', JSON.stringify(updateErr));
        toast({ title: t('taskAssignment.error'), description: updateErr.message, variant: "destructive" });
        return;
      }
      if (!updated) {
        console.error('[TaskAssignmentModal] Update returned 0 rows — not the assignee or task gone');
        toast({ title: t('taskAssignment.error'), description: t('taskAssignment.acceptError'), variant: "destructive" });
        return;
      }
      console.log('[TaskAssignmentModal] Task updated successfully');

      // 3) Insert task_event
      console.log('[TaskAssignmentModal] Inserting task_event (accepted)...');
      const { error: evErr } = await supabase.from("task_events").insert({
        task_id: task.id,
        family_id: familyId,
        recipient_id: task.assignedBy,
        actor_id: user.id,
        event_type: "accepted",
        payload: {
          name: task.name,
          stars: task.starValue,
          due_date: task.dueDate,
          actor_name: (user as any)?.displayName ?? "Someone",
        },
      });
      if (evErr) console.error("[TaskAssignmentModal] task_events insert failed:", JSON.stringify(evErr));

      // 4) Push notify assigner
      if (!evErr) {
        console.log('[TaskAssignmentModal] Sending push to assigner...');
        await supabase.functions
          .invoke("send-push", {
            body: {
              recipientId: task.assignedBy,
              title: "Task accepted",
              body: `${(user as any)?.displayName ?? "Someone"} accepted "${task.name}"`,
              data: { type: "task_accepted", event_type: "accepted", taskId: task.id, task_id: task.id, familyId, family_id: familyId },
            },
          })
          .catch((e) => console.error("[TaskAssignmentModal] send-push failed:", String(e)));
      }

      // 5) Dispatch refresh event
      window.dispatchEvent(new CustomEvent('tasks:changed'));

      toast({
        title: t('taskAssignment.accepted'),
        description: t('taskAssignment.acceptedDesc', { taskName: translateTaskName(task.name, t) }),
      });

      onTaskResponse?.(task.id, true);
      console.log('[TaskAssignmentModal] Closing modal after accept');
      onOpenChange(false);
    } catch (error) {
      console.error("[TaskAssignmentModal] Accept threw:", String(error));
      toast({ title: t('taskAssignment.error'), description: t('taskAssignment.acceptError'), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    console.log('[TaskAssignmentModal] REJECT CLICK', { taskId: task.id, familyId, userId: user.id });

    try {
      // 1) Direct delete with assignee guard
      console.log('[TaskAssignmentModal] Deleting task...');
      const { data: deleted, error: delErr } = await supabase
        .from('tasks')
        .delete()
        .eq('id', task.id)
        .eq('assigned_to', user.id)
        .select('id');

      if (delErr) {
        console.error('[TaskAssignmentModal] Delete error:', JSON.stringify(delErr));
        toast({ title: t('taskAssignment.error'), description: delErr.message, variant: "destructive" });
        return;
      }
      if (!deleted || deleted.length === 0) {
        console.error('[TaskAssignmentModal] Delete returned 0 rows — not the assignee or task gone');
        toast({ title: t('taskAssignment.error'), description: t('taskAssignment.rejectError'), variant: "destructive" });
        return;
      }
      console.log('[TaskAssignmentModal] Task deleted successfully');

      // 2) Insert task_event
      console.log('[TaskAssignmentModal] Inserting task_event (rejected)...');
      const { error: evErr } = await supabase.from("task_events").insert({
        task_id: task.id,
        family_id: familyId,
        recipient_id: task.assignedBy,
        actor_id: user.id,
        event_type: "rejected",
        payload: {
          name: task.name,
          stars: task.starValue,
          due_date: task.dueDate,
          actor_name: (user as any)?.displayName ?? "Someone",
        },
      });
      if (evErr) console.error("[TaskAssignmentModal] task_events insert failed:", JSON.stringify(evErr));

      // 3) Push notify assigner
      if (!evErr) {
        console.log('[TaskAssignmentModal] Sending push to assigner...');
        await supabase.functions
          .invoke("send-push", {
            body: {
              recipientId: task.assignedBy,
              title: "Task rejected",
              body: `${(user as any)?.displayName ?? "Someone"} rejected "${task.name}"`,
              data: { type: "task_rejected", event_type: "rejected", taskId: task.id, task_id: task.id, familyId, family_id: familyId },
            },
          })
          .catch((e) => console.error("[TaskAssignmentModal] send-push failed:", String(e)));
      }

      // 4) Dispatch refresh event
      window.dispatchEvent(new CustomEvent('tasks:changed'));

      toast({
        title: t('taskAssignment.rejected'),
        description: t('taskAssignment.rejectedDesc', { taskName: translateTaskName(task.name, t) }),
      });

      onTaskResponse?.(task.id, false);
      console.log('[TaskAssignmentModal] Closing modal after reject');
      onOpenChange(false);
    } catch (error) {
      console.error("[TaskAssignmentModal] Reject threw:", String(error));
      toast({ title: t('taskAssignment.error'), description: t('taskAssignment.rejectError'), variant: "destructive" });
    } finally {
      setIsProcessing(false);
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

          <div className="flex gap-2">
            <Button
              onClick={handleAccept}
              disabled={isProcessing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {isProcessing ? t('common.loading') : t('taskAssignment.accept')}
            </Button>
            <Button
              onClick={handleReject}
              disabled={isProcessing}
              variant="destructive"
              className="flex-1"
            >
              {isProcessing ? t('common.loading') : t('taskAssignment.reject')}
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
