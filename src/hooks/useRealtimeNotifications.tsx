// src/hooks/useRealtimeNotifications.tsx
import { useEffect, useRef } from 'react';
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
  event_type: 'assigned' | 'accepted' | 'rejected' | string;
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
  const {
    activeFamilyId,
    getUserProfile,
  } = useApp();

  const { openAssignmentModal } = useAssignmentModal();
  const handledEventIds = useRef<Set<string>>(new Set());

  // Stable refs for callbacks to prevent subscription churn
  const toastRef = useRef(toast);
  const openModalRef = useRef(openAssignmentModal);
  const getUserProfileRef = useRef(getUserProfile);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    openModalRef.current = openAssignmentModal;
  }, [openAssignmentModal]);

  useEffect(() => {
    getUserProfileRef.current = getUserProfile;
  }, [getUserProfile]);

  // Debounce refresh for category/template sync
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      try {
        refreshData();
      } catch (err) {
        console.error('[family_sync] refreshData() failed:', err);
      }
    }, 150);
  };

  // CHAT NOTIFICATIONS - Global listener for chat messages
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const channelName = `chat-notifications:${user.id}:${activeFamilyId}`;
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const row = (e as any).new as {
            id: string;
            family_id: string;
            user_id: string;
            content: string;
            created_at: string;
          } | undefined;

          if (!row || row.user_id === user.id) return; // Ignore own messages

          // De-duplicate
          if (handledEventIds.current.has(`chat-${row.id}`)) return;
          handledEventIds.current.add(`chat-${row.id}`);

          // Get sender name
          const senderProfile = getUserProfileRef.current(row.user_id);
          const senderName = senderProfile?.displayName || 'Family Member';

          toastRef.current({
            title: 'New chat message',
            description: `${senderName}: ${row.content.substring(0, 50)}${row.content.length > 50 ? '...' : ''}`,
          });
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.warn(`[chat-notifications] Channel status: ${status}`);
      });

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, activeFamilyId]);

  // TASK EVENTS (recipient only) — open modal immediately on "assigned", with de-dupe
  useEffect(() => {
    if (!user?.id) return;
  
    const chan = `task-events:${user.id}`;
    const ch = supabase
      .channel(chan)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events', filter: `recipient_id=eq.${user.id}` },
        async (e) => {
          const row = (e as any).new as TaskEvent | undefined;
          if (!row) return;
  
          // 🔒 ignore the same event id if we've already handled it
          if (row.id) {
            if (handledEventIds.current.has(row.id)) return;
            handledEventIds.current.add(row.id);
          }
  
          const evtType = row.event_type;
  
          if (evtType === 'assigned') {
            try {
              const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', row.task_id)
                .single();
  
              if (error || !data) {
                const actor = row.payload?.actor_name ?? 'Someone';
                const taskName = row.payload?.name ?? 'a task';
                toastRef.current({ title: 'New task assigned', description: `${actor} assigned "${taskName}" to you.` });
                return;
              }
  
              const taskForModal = {
                id: data.id,
                name: data.name,
                description: data.description ?? '',
                starValue: data.star_value ?? 0,
                assignedBy: data.assigned_by,
                assignedTo: data.assigned_to,
                dueDate: data.due_date,
                familyId: data.family_id ?? activeFamilyId,
                categoryId: data.category_id,
                completed: !!data.completed,
              } as any;
  
              openModalRef.current(taskForModal);
            } catch (err) {
              console.error('[task_events] open modal failed:', err);
            }
            return;
          }
  
          // accepted / rejected → toast for the assigner
          const actor = row.payload?.actor_name ?? 'Someone';
          const taskName = row.payload?.name ?? 'your task';
          if (evtType === 'accepted') {
            toastRef.current({ title: 'Task accepted', description: `${actor} accepted "${taskName}".` });
          } else if (evtType === 'rejected') {
            toastRef.current({ title: 'Task rejected', description: `${actor} rejected "${taskName}".` });
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.warn(`[task-events] Channel status: ${status}`);
      });
  
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, activeFamilyId]);

  // FAMILY SYNC (categories/templates) — silent refresh
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const chan = `family-sync:${activeFamilyId}`;
    const ch = supabase
      .channel(chan)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_sync_events', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const row = (e as any).new as FamilySyncEvent | undefined;
          if (!row) {
            console.error('[family_sync] Missing .new in realtime event:', e);
            return;
          }
          if (!row.entity || !row.op) {
            console.error('[family_sync] Missing entity/op in row:', row);
            return;
          }
          debounceRefresh();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.warn(`[family_sync] Channel status: ${status}`);
      });

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, activeFamilyId, refreshData]);
}
