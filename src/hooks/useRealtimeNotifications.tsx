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

  // CHAT NOTIFICATIONS - Global listener for chat messages (NO filter, manual check)
  useEffect(() => {
    if (!user?.id || !activeFamilyId) {
      console.log('[chat-notifications] Skipping - no user or family', { userId: user?.id, familyId: activeFamilyId });
      return;
    }

    // Use a stable channel name with "global" prefix to avoid conflicts with page-level subscriptions
    const channelName = `global-chat-notifications:${user.id}:${activeFamilyId}`;
    console.log(`[chat-notifications] Setting up GLOBAL subscription for channel: ${channelName}`);
    
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' }, // No filter - manual check below
        (e) => {
          console.log('[chat-notifications] Received realtime event:', e);
          
          const row = (e as any).new as {
            id: string;
            family_id: string;
            user_id: string;
            content: string;
            created_at: string;
          } | undefined;

          if (!row) {
            console.warn('[chat-notifications] Missing row data in event');
            return;
          }

          // Manual filter: check family and ignore own messages
          if (row.family_id !== activeFamilyId) {
            console.log('[chat-notifications] Ignoring - different family', { rowFamily: row.family_id, activeFamily: activeFamilyId });
            return;
          }
          if (row.user_id === user.id) {
            console.log('[chat-notifications] Ignoring - own message');
            return;
          }

          // De-duplicate
          if (handledEventIds.current.has(`chat-${row.id}`)) {
            console.log('[chat-notifications] Ignoring - duplicate event');
            return;
          }
          handledEventIds.current.add(`chat-${row.id}`);

          // Get sender name
          const senderProfile = getUserProfileRef.current(row.user_id);
          const senderName = senderProfile?.displayName || 'Family Member';

          console.log('[chat-notifications] Showing toast for message from:', senderName);
          toastRef.current({
            title: 'New chat message',
            description: `${senderName}: ${row.content.substring(0, 50)}${row.content.length > 50 ? '...' : ''}`,
          });
        }
      )
      .subscribe((status, err) => {
        console.log(`[chat-notifications] GLOBAL Subscription status: ${status}`, err || '');
      });

    return () => { 
      console.log(`[chat-notifications] Cleaning up GLOBAL channel: ${channelName}`);
      supabase.removeChannel(ch); 
    };
  }, [user?.id, activeFamilyId]);

  // TASK EVENTS (recipient only) — open modal immediately on "assigned", with de-dupe
  // NO filter - manual check for recipient_id
  useEffect(() => {
    if (!user?.id) {
      console.log('[task-events] Skipping - no user');
      return;
    }
  
    // Use stable channel name to avoid conflicts
    const chan = `global-task-events:${user.id}`;
    console.log(`[task-events] Setting up GLOBAL subscription for channel: ${chan}`);
    
    const ch = supabase
      .channel(chan)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events' }, // No filter - manual check below
        async (e) => {
          console.log('[task-events] Received realtime event:', e);
          
          const row = (e as any).new as TaskEvent | undefined;
          if (!row) {
            console.warn('[task-events] Missing row data in event');
            return;
          }

          // Manual filter: check recipient_id
          if (row.recipient_id !== user.id) {
            console.log('[task-events] Ignoring - not for current user', { recipient: row.recipient_id, me: user.id });
            return;
          }
  
          // 🔒 ignore the same event id if we've already handled it
          if (row.id) {
            if (handledEventIds.current.has(row.id)) {
              console.log('[task-events] Ignoring - duplicate event');
              return;
            }
            handledEventIds.current.add(row.id);
          }
  
          const evtType = row.event_type;
          console.log('[task-events] Processing event type:', evtType);
  
          if (evtType === 'assigned') {
            try {
              const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', row.task_id)
                .single();
  
              if (error || !data) {
                console.warn('[task-events] Could not fetch task, showing toast instead:', error);
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
  
              console.log('[task-events] Opening assignment modal for task:', taskForModal.name);
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
            console.log('[task-events] Showing accepted toast');
            toastRef.current({ title: 'Task accepted', description: `${actor} accepted "${taskName}".` });
          } else if (evtType === 'rejected') {
            console.log('[task-events] Showing rejected toast');
            toastRef.current({ title: 'Task rejected', description: `${actor} rejected "${taskName}".` });
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[task-events] GLOBAL Subscription status: ${status}`, err || '');
      });
  
    return () => { 
      console.log(`[task-events] Cleaning up GLOBAL channel: ${chan}`);
      supabase.removeChannel(ch); 
    };
  }, [user?.id]); // Only depend on user.id - task events are filtered by recipient_id, not family

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
