// src/hooks/useRealtimeNotifications.tsx
import { useEffect, useRef, useState } from 'react';
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
  payload: { 
    name?: string; 
    description?: string;
    stars?: number;
    due_date?: string;
    category_id?: string;
    actor_name?: string;
  } | null;
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

  // Reconnect trigger - incrementing this forces subscriptions to re-create
  const [reconnectTrigger, setReconnectTrigger] = useState(0);

  // Stable refs for callbacks to prevent subscription churn
  const toastRef = useRef(toast);
  const openModalRef = useRef(openAssignmentModal);
  const getUserProfileRef = useRef(getUserProfile);
  const activeFamilyIdRef = useRef(activeFamilyId);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    openModalRef.current = openAssignmentModal;
  }, [openAssignmentModal]);

  useEffect(() => {
    getUserProfileRef.current = getUserProfile;
  }, [getUserProfile]);

  useEffect(() => {
    activeFamilyIdRef.current = activeFamilyId;
  }, [activeFamilyId]);

  // AUTH STATE LISTENER - Reconnect on token refresh or sign in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        console.log('[realtime] Auth event:', event, '- triggering reconnect');
        setReconnectTrigger(prev => prev + 1);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    if (!user?.id) {
      console.log('[chat-notifications] Skipping - no user');
      return;
    }

    if (!activeFamilyId) {
      console.log('[chat-notifications] Skipping - no activeFamilyId');
      return;
    }

    const channelName = `chat-notif:${activeFamilyId}:${user.id}:${reconnectTrigger}`;
    console.log(`[chat-notifications] Setting up subscription`, { channelName, familyId: activeFamilyId, trigger: reconnectTrigger });
    
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'chat_messages',
          filter: `family_id=eq.${activeFamilyId}`
        },
        (e) => {
          console.log('[chat-notifications] Event received:', e);
          
          const row = (e as any).new as {
            id: string;
            family_id: string;
            user_id: string;
            content: string;
            created_at: string;
          } | undefined;

          if (!row) {
            console.warn('[chat-notifications] Missing row data');
            return;
          }

          // Skip own messages
          if (row.user_id === user.id) {
            console.log('[chat-notifications] Skipping own message');
            return;
          }

          // De-duplicate
          const eventKey = `chat-${row.id}`;
          if (handledEventIds.current.has(eventKey)) {
            console.log('[chat-notifications] Skipping duplicate');
            return;
          }
          handledEventIds.current.add(eventKey);

          // Get sender name
          const senderProfile = getUserProfileRef.current(row.user_id);
          const senderName = senderProfile?.displayName || 'Family Member';

          console.log('[chat-notifications] Showing toast:', { sender: senderName, messageId: row.id });
          toastRef.current({
            title: 'New chat message',
            description: `${senderName}: ${row.content.substring(0, 50)}${row.content.length > 50 ? '...' : ''}`,
          });
        }
      )
      .subscribe((status, err) => {
        console.log(`[chat-notifications] Status: ${status}`, err || '');
        if (err) {
          console.error('[chat-notifications] Error:', err);
        }
        // Error recovery - schedule reconnect on channel errors
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[chat-notifications] Channel error/timeout, scheduling reconnect in 5s');
          setTimeout(() => setReconnectTrigger(prev => prev + 1), 5000);
        }
      });

    // Heartbeat for debugging
    const heartbeat = setInterval(() => {
      console.log('[chat-notifications] Heartbeat - channel active');
    }, 60000);

    return () => { 
      clearInterval(heartbeat);
      console.log(`[chat-notifications] Cleanup: ${channelName}`);
      supabase.removeChannel(ch); 
    };
  }, [user?.id, activeFamilyId, reconnectTrigger]);

  // TASK EVENTS (recipient only)
  useEffect(() => {
    if (!user?.id) {
      console.log('[task-events] Skipping - no user');
      return;
    }
  
    const chan = `task-events:${user.id}:${reconnectTrigger}`;
    console.log(`[task-events] Setting up subscription`, { channel: chan, trigger: reconnectTrigger });
    
    const ch = supabase
      .channel(chan)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events' },
        async (e) => {
          console.log('[task-events] Event received:', e);
          
          const row = (e as any).new as TaskEvent | undefined;
          if (!row) {
            console.warn('[task-events] Missing row data');
            return;
          }

          // Manual filter: check recipient_id
          if (row.recipient_id !== user.id) {
            console.log('[task-events] Ignoring - not for current user');
            return;
          }
  
          // De-duplicate
          if (row.id && handledEventIds.current.has(row.id)) {
            console.log('[task-events] Ignoring - duplicate');
            return;
          }
          if (row.id) handledEventIds.current.add(row.id);
  
          const evtType = row.event_type;
          console.log('[task-events] Processing:', evtType);
  
          if (evtType === 'assigned') {
            const taskForModal = {
              id: row.task_id,
              name: row.payload?.name ?? 'New Task',
              description: row.payload?.description ?? '',
              starValue: row.payload?.stars ?? 0,
              assignedBy: row.actor_id,
              assignedTo: user.id,
              dueDate: row.payload?.due_date,
              familyId: row.family_id,
              categoryId: row.payload?.category_id,
              completed: false,
            } as any;

            console.log('[task-events] Opening assignment modal:', taskForModal.name);
            openModalRef.current(taskForModal);
            return;
          }
  
          // accepted / rejected / completed → toast
          const actor = row.payload?.actor_name ?? 'Someone';
          const taskName = row.payload?.name ?? 'your task';
          if (evtType === 'accepted') {
            toastRef.current({ title: 'Task accepted', description: `${actor} accepted "${taskName}".` });
          } else if (evtType === 'rejected') {
            toastRef.current({ title: 'Task rejected', description: `${actor} rejected "${taskName}".` });
          } else if (evtType === 'completed') {
            toastRef.current({ title: 'Task completed! 🎉', description: `${actor} completed "${taskName}".` });
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[task-events] Status: ${status}`, err || '');
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('[task-events] Error, scheduling reconnect in 5s');
          setTimeout(() => setReconnectTrigger(prev => prev + 1), 5000);
        }
      });
  
    return () => { 
      console.log(`[task-events] Cleanup: ${chan}`);
      supabase.removeChannel(ch); 
    };
  }, [user?.id, reconnectTrigger]);

  // FAMILY SYNC (categories/templates) — silent refresh
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const chan = `family-sync:${activeFamilyId}:${reconnectTrigger}`;
    const ch = supabase
      .channel(chan)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_sync_events', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const row = (e as any).new as FamilySyncEvent | undefined;
          if (!row?.entity || !row?.op) return;
          debounceRefresh();
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setTimeout(() => setReconnectTrigger(prev => prev + 1), 5000);
        }
      });

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, activeFamilyId, refreshData, reconnectTrigger]);
}