// src/hooks/useRealtimeNotifications.tsx
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';
import { useAssignmentModal } from "@/contexts/AssignmentModalContext";
import type { RealtimeChannel } from '@supabase/supabase-js';

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

const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

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

  // Track active channels and connection state
  const taskEventsChannel = useRef<RealtimeChannel | null>(null);
  const chatChannel = useRef<RealtimeChannel | null>(null);
  const familySyncChannel = useRef<RealtimeChannel | null>(null);
  
  // Track if component is mounted (to prevent reconnection after unmount)
  const isMounted = useRef(true);
  const reconnectAttempts = useRef<Record<string, number>>({});

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

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // TASK EVENTS (recipient only) — open modal immediately on "assigned", with reconnection
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `task-events:${user.id}`;
    reconnectAttempts.current[channelName] = 0;

    const createTaskEventsChannel = () => {
      // Clean up existing channel first
      if (taskEventsChannel.current) {
        supabase.removeChannel(taskEventsChannel.current);
        taskEventsChannel.current = null;
      }

      if (!isMounted.current) return;

      console.log(`[task-events] Creating channel for user ${user.id}`);

      const ch = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'task_events', filter: `recipient_id=eq.${user.id}` },
          async (e) => {
            const row = (e as any).new as TaskEvent | undefined;
            if (!row) return;

            // Ignore the same event id if we've already handled it
            if (row.id) {
              if (handledEventIds.current.has(row.id)) return;
              handledEventIds.current.add(row.id);
            }

            console.log('[task-events] Received event:', row.event_type, row.id);

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
                  toast({ title: 'New task assigned', description: `${actor} assigned "${taskName}" to you.` });
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

                openAssignmentModal(taskForModal);
              } catch (err) {
                console.error('[task_events] open modal failed:', err);
              }
              return;
            }

            // accepted / rejected / completed → toast for the assigner
            const actor = row.payload?.actor_name ?? 'Someone';
            const taskName = row.payload?.name ?? 'your task';
            if (evtType === 'accepted') {
              toast({ title: 'Task accepted', description: `${actor} accepted "${taskName}".` });
            } else if (evtType === 'rejected') {
              toast({ title: 'Task rejected', description: `${actor} rejected "${taskName}".` });
            } else if (evtType === 'completed') {
              toast({ title: 'Task completed', description: `${actor} completed "${taskName}".` });
            }
          }
        )
        .subscribe((status, err) => {
          console.log(`[task-events] Channel status: ${status}`, err || '');
          
          if (status === 'SUBSCRIBED') {
            console.log('[task-events] ✓ Successfully subscribed');
            reconnectAttempts.current[channelName] = 0;
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn(`[task-events] Channel ${status}, attempting reconnect...`);
            
            // Attempt reconnection if component is still mounted
            if (isMounted.current) {
              const attempts = reconnectAttempts.current[channelName] || 0;
              if (attempts < MAX_RECONNECT_ATTEMPTS) {
                reconnectAttempts.current[channelName] = attempts + 1;
                setTimeout(() => {
                  if (isMounted.current) {
                    console.log(`[task-events] Reconnect attempt ${attempts + 1}/${MAX_RECONNECT_ATTEMPTS}`);
                    createTaskEventsChannel();
                  }
                }, RECONNECT_DELAY * (attempts + 1));
              } else {
                console.error('[task-events] Max reconnect attempts reached');
              }
            }
          }
        });

      taskEventsChannel.current = ch;
    };

    createTaskEventsChannel();

    return () => {
      if (taskEventsChannel.current) {
        console.log('[task-events] Cleaning up channel');
        supabase.removeChannel(taskEventsChannel.current);
        taskEventsChannel.current = null;
      }
    };
  }, [user?.id, openAssignmentModal, toast, activeFamilyId]);

  // CHAT EVENTS with reconnection
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const channelName = `chat-global:${activeFamilyId}`;
    reconnectAttempts.current[channelName] = 0;

    const createChatChannel = () => {
      if (chatChannel.current) {
        supabase.removeChannel(chatChannel.current);
        chatChannel.current = null;
      }

      if (!isMounted.current) return;

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
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempts.current[channelName] = 0;
          } else if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && isMounted.current) {
            const attempts = reconnectAttempts.current[channelName] || 0;
            if (attempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts.current[channelName] = attempts + 1;
              setTimeout(() => {
                if (isMounted.current) createChatChannel();
              }, RECONNECT_DELAY * (attempts + 1));
            }
          }
        });

      chatChannel.current = ch;
    };

    createChatChannel();

    return () => {
      if (chatChannel.current) {
        supabase.removeChannel(chatChannel.current);
        chatChannel.current = null;
      }
    };
  }, [user?.id, activeFamilyId, toast, getUserProfile]);

  // FAMILY SYNC (categories/templates) with reconnection
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const channelName = `family-sync:${activeFamilyId}`;
    reconnectAttempts.current[channelName] = 0;

    const createFamilySyncChannel = () => {
      if (familySyncChannel.current) {
        supabase.removeChannel(familySyncChannel.current);
        familySyncChannel.current = null;
      }

      if (!isMounted.current) return;

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
            if (!row.entity || !row.op) {
              console.error('[family_sync] Missing entity/op in row:', row);
              return;
            }
            debounceRefresh();
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            reconnectAttempts.current[channelName] = 0;
          } else if ((status === 'CLOSED' || status === 'CHANNEL_ERROR') && isMounted.current) {
            const attempts = reconnectAttempts.current[channelName] || 0;
            if (attempts < MAX_RECONNECT_ATTEMPTS) {
              reconnectAttempts.current[channelName] = attempts + 1;
              setTimeout(() => {
                if (isMounted.current) createFamilySyncChannel();
              }, RECONNECT_DELAY * (attempts + 1));
            }
          }
        });

      familySyncChannel.current = ch;
    };

    createFamilySyncChannel();

    return () => {
      if (familySyncChannel.current) {
        supabase.removeChannel(familySyncChannel.current);
        familySyncChannel.current = null;
      }
    };
  }, [user?.id, activeFamilyId, debounceRefresh]);
}
