// src/hooks/useRealtimeNotifications.tsx
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';
import { useAssignmentModal } from "@/contexts/AssignmentModalContext";

type TaskEvent = {
  id: string;
  family_id: string;
  task_id: string | null;
  recipient_id: string | null;
  actor_id: string | null;
  event_type: 'assigned' | 'accepted' | 'rejected' | 'completed' | string;
  payload: { name?: string; actor_name?: string } | null;
  created_at: string;
};

type FamilySyncEvent = {
  id: string;
  family_id: string;
  entity: 'task_category' | 'task_template' | string;
  op: 'insert' | 'update' | 'delete' | string;
  entity_id: string;
  payload: any;
  created_at: string;
};

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshData } = useTasks();
  const { activeFamilyId } = useApp();
  const { openAssignmentModal } = useAssignmentModal();

  const handledEventIds = useRef<Set<string>>(new Set());

  // Debounce refresh for category/template sync
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRefresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      try {
        refreshData();
      } catch (err) {
        console.error('[family_sync] refreshData() failed:', err);
      }
    }, 150);
  }, [refreshData]);

  // TASK EVENTS
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `task-events:${user.id}`;
    console.log(`[task-events] Creating channel for user ${user.id}`);

    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events', filter: `recipient_id=eq.${user.id}` },
        async (e) => {
          const row = (e as any).new as TaskEvent | undefined;
          if (!row) return;

          if (row.id && handledEventIds.current.has(row.id)) return;
          if (row.id) handledEventIds.current.add(row.id);

          if (row.event_type === 'assigned') {
            try {
              const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', row.task_id)
                .single();

              if (error || !data) return;
              if (data.assigned_to !== user.id) return;

              const taskFamilyId = row.family_id || data.family_id;
              openAssignmentModal({
                id: data.id, name: data.name, description: data.description ?? '',
                starValue: data.star_value ?? 0, assignedBy: data.assigned_by,
                assignedTo: data.assigned_to, dueDate: data.due_date,
                familyId: taskFamilyId, categoryId: data.category_id,
                completed: !!data.completed,
              } as any);
            } catch (err) {
              console.error('[REALTIME] Error in assigned handler:', err);
            }
            return; // NO TOAST for 'assigned'
          }

          const actor = row.payload?.actor_name ?? 'Someone';
          const taskName = row.payload?.name ?? 'your task';
          if (row.event_type === 'accepted') {
            toast({ title: 'Task accepted', description: `${actor} accepted "${taskName}".` });
          } else if (row.event_type === 'rejected') {
            toast({ title: 'Task rejected', description: `${actor} rejected "${taskName}".` });
          } else if (row.event_type === 'completed') {
            toast({ title: 'Task completed', description: `${actor} completed "${taskName}".` });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[task-events] ✓ Subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[task-events] Channel error:', err);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, openAssignmentModal, toast]);

  // CHAT EVENTS — NO toast here. useChat already handles chat toasts.
  // Removed to prevent duplicate toasts.

  // FAMILY SYNC (categories/templates)
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const channelName = `family-sync:${activeFamilyId}`;

    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_sync_events', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const row = (e as any).new as FamilySyncEvent | undefined;
          if (!row) return;
          debounceRefresh();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[family-sync] Channel status: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, activeFamilyId, debounceRefresh]);
}
