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
  const { activeFamilyId, getUserProfile } = useApp();
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

  // TASK EVENTS - Simple pattern matching useChat.tsx
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

          // Deduplicate events
          if (row.id && handledEventIds.current.has(row.id)) return;
          if (row.id) handledEventIds.current.add(row.id);

          console.log('[task-events] Received event:', row.event_type, row.id);

          if (row.event_type === 'assigned') {
            try {
              const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', row.task_id)
                .single();

              if (error || !data) {
                console.error('[task-events] Failed to fetch task:', error);
                // Fallback: still try to show modal with event payload data
                openAssignmentModal({
                  id: row.task_id!,
                  name: row.payload?.name || 'New Task',
                  description: '',
                  starValue: 0,
                  assignedBy: row.actor_id!,
                  assignedTo: user.id,
                  dueDate: new Date().toISOString().split('T')[0],
                  familyId: row.family_id,
                  categoryId: '',
                  completed: false,
                } as any);
                return;
              }

              // Use row.family_id from event as primary (guaranteed), fallback to data.family_id
              const taskFamilyId = row.family_id || data.family_id;
              console.log('[task-events] Opening assignment modal for task:', data.name, 'familyId:', taskFamilyId);

              openAssignmentModal({
                id: data.id,
                name: data.name,
                description: data.description ?? '',
                starValue: data.star_value ?? 0,
                assignedBy: data.assigned_by,
                assignedTo: data.assigned_to,
                dueDate: data.due_date,
                familyId: taskFamilyId,
                categoryId: data.category_id,
                completed: !!data.completed,
              } as any);
            } catch (err) {
              console.error('[task-events] open modal failed:', err);
            }
            return;
          }

          // accepted / rejected / completed → toast for the assigner
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
          console.log('[task-events] ✓ Successfully subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[task-events] Channel error:', err);
        } else {
          console.log(`[task-events] Channel status: ${status}`);
        }
      });

    return () => {
      console.log('[task-events] Cleaning up channel');
      supabase.removeChannel(ch);
    };
  }, [user?.id, openAssignmentModal, toast]);

  // CHAT EVENTS - Simple pattern
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const channelName = `chat-global:${activeFamilyId}`;

    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const row = (e as any).new as { user_id: string; content: string } | undefined;
          if (!row || row.user_id === user.id) return;
          const name = getUserProfile(row.user_id)?.displayName ?? 'Family member';
          toast({ title: 'New chat message', description: `${name}: ${row.content}` });
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[chat-global] Channel status: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, activeFamilyId, toast, getUserProfile]);

  // FAMILY SYNC (categories/templates) - Simple pattern
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
          if (!row) {
            console.error('[family_sync] Missing .new in realtime event:', e);
            return;
          }
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
