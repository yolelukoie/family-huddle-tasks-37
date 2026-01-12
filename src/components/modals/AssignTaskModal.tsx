import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useApp } from "@/hooks/useApp";
import { useTasks } from "@/hooks/useTasks";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const assignTaskSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  description: z.string().optional(),
  assignedTo: z.string().min(1, "Please select who to assign this task to"),
  dueDate: z.string().min(1, "Due date is required"),
  starValue: z.coerce.number().min(0).max(20, "Star value must be between 0 and 20"),
});

type AssignTaskForm = z.infer<typeof assignTaskSchema>;

interface AssignTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskAssigned?: () => void;
}

export function AssignTaskModal({ open, onOpenChange, onTaskAssigned }: AssignTaskModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeFamilyId, getFamilyMembers, getUserProfile } = useApp();
  const { toast } = useToast();
  const { addTask, ensureCategoryByName } = useTasks();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AssignTaskForm>({
    resolver: zodResolver(assignTaskSchema),
    defaultValues: {
      starValue: 1,
    },
  });

  if (!user || !activeFamilyId) return null;

  const members = activeFamilyId ? getFamilyMembers(activeFamilyId) : [];
  const otherMembers = members.filter((m) => m.userId !== user.id);

  // Check if user is 18+ for star value editing
  const canEditStars = user.age >= 18;

  const onSubmit = async (data: AssignTaskForm) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Ensure "Assigned" category exists
      const assignedCategory = await ensureCategoryByName("Assigned");
      if (!assignedCategory) {
        setIsSubmitting(false);
        return;
      }

      // If assigning to someone else, set status to 'pending' so it requires accept/reject
      const isAssigningToOther = data.assignedTo !== user.id;

      const result = await addTask({
        name: data.name,
        description: data.description || "",
        assignedTo: data.assignedTo,
        assignedBy: user.id,
        dueDate: data.dueDate,
        starValue: data.starValue,
        completed: false,
        categoryId: assignedCategory.id,
        familyId: activeFamilyId,
        status: isAssigningToOther ? 'pending' : 'active',
      });

    try {
      // Accept BOTH shapes: { id, ... } OR { task: { id, ... }, ... }
      const createdId = (result as any)?.id ?? (result as any)?.task?.id;

      const familyId = (result as any)?.familyId ?? (result as any)?.family_id ?? activeFamilyId;

      const assignedToVal = (result as any)?.assignedTo ?? (result as any)?.assigned_to ?? form.getValues().assignedTo;

      const createdName = (result as any)?.name ?? (result as any)?.task?.name ?? form.getValues().name;

      const createdDue = (result as any)?.dueDate ?? (result as any)?.due_date ?? form.getValues().dueDate ?? null;

      if (!createdId || !familyId || !assignedToVal) {
        console.error("[task_events] missing fields", { createdId, familyId, assignedToVal, result });
      } else {
        const { data: evRow, error: evErr } = await supabase
          .from("task_events")
          .insert({
            task_id: createdId,
            family_id: familyId,
            recipient_id: assignedToVal,
            actor_id: user.id,
            event_type: "assigned",
            payload: {
              name: createdName,
              due_date: createdDue ? new Date(createdDue).toISOString() : null,
              actor_name: (user as any)?.displayName ?? "Someone",
            },
          })
          .select("id")
          .single();

        if (evErr) {
          console.error("[task_events] insert failed (assigned):", evErr);
        } else {
          console.log("[task_events] insert ok (assigned), id=", evRow?.id);

          // 🔔 push notify — include event_type, task_id, family_id for FCM handler
          try {
            await supabase.functions.invoke("send-push", {
              body: {
                recipientId: assignedToVal,
                title: "New task assigned",
                body: `${(user as any)?.displayName ?? "Someone"} assigned "${createdName}" to you`,
                data: { 
                  event_type: "assigned", 
                  task_id: createdId,
                  family_id: familyId,
                },
              },
            });
          } catch (pushErr) {
            console.error("[send-push] invoke failed:", pushErr);
          }
        }
      }
      } catch (e) {
        console.error("[task_events] insert threw (assigned):", e);
      }

      if (result) {
        toast({
          title: t("assignTask.taskAssigned"),
          description: t("assignTask.taskAssignedDesc", { taskName: data.name }),
        });

        form.reset();
        onOpenChange(false);
        onTaskAssigned?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("assignTask.title")}</DialogTitle>
          <DialogDescription>{t("assignTask.description")}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasks.taskName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("tasks.taskNamePlaceholder")} {...field} />
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
                  <FormLabel>{t("tasks.description")}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t("tasks.descriptionPlaceholder")} rows={2} {...field} />
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
                    <FormLabel>{t("assignTask.assignTo")}</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("assignTask.selectPerson")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={user.id}>{getUserProfile(user.id)?.displayName ?? t("assignTask.myself")}</SelectItem>
                        {otherMembers.map((m) => {
                          const p = getUserProfile(m.userId);
                          const label = p?.displayName ?? `${t("assignTask.member")} ${m.userId.slice(-4)}`;
                          return (
                            <SelectItem key={m.userId} value={m.userId}>
                              {label}
                            </SelectItem>
                          );
                        })}
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
                    <FormLabel>{t("assignTask.dueDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="starValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("assignTask.stars")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" max="20" disabled={!canEditStars} {...field} />
                    </FormControl>
                    {!canEditStars && (
                      <p className="text-xs text-muted-foreground">{t("tasks.starValueRestriction")}</p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-family-warm hover:bg-family-warm/90">
                {isSubmitting ? t("common.loading") : t("assignTask.assignTask")}
              </Button>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
