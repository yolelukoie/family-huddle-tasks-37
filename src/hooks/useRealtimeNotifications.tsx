// src/hooks/useRealtimeNotifications.tsx
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';

type TaskEvent = {
  id: string;
  family_id: string;
  task_id: string | null;
  recipient_id: string | null;
  actor_id: string | null;
  event_type: 'assigned' | 'accepted' | 'rejected' | string;
  payload: { name?: string; task_name?: string; actor_name?: string } | null;
  created_at: string;
};

type ChatMessage = {
  id: string;
  family_id: string;
  author_id: string;
  content: string;
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
  const { activeFamilyId } = useApp();
  const { refreshData } = useTasks();

  // Debounce refresh so bursts of sync events don't spam network
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

  // --- TASK EVENTS (notify recipient) ---
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `task-events:${user.id}`;
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_events',
          filter: `recipient_id=eq.${user.id}`,
        },
        (e) => {
          const row = (e as any).new as TaskEvent | undefined;
          if (!row) {
            console.error('[task_events] Realtime event missing .new row:', e);
            return;
          }
          if (!row.payload) {
            console.error('[task_events] payload is null for row:', row);
            return;
          }

          const taskName =
            row.payload.name ??
            row.payload.task_name ?? // tolerate older/other senders
            null;

          const actor = row.payload.actor_name ?? 'Someone';

          if (!taskName) {
            console.error('[task_events] payload missing task name (expected payload.name). Row:', row);
          }

          switch (row.event_type) {
            case 'assigned':
              toast({
                title: 'New task assigned',
                description: `${actor} assigned "${taskName ?? 'a task'}" to you.`,
              });
              break;
            case 'accepted':
              toast({
                title: 'Task accepted',
                description: `${actor} accepted "${taskName ?? 'your task'}".`,
              });
              break;
            case 'rejected':
              toast({
                title: 'Task rejected',
                description: `${actor} rejected "${taskName ?? 'your task'}".`,
              });
              break;
            default:
              console.warn('[task_events] Unknown event_type:', row.event_type, 'Row:', row);
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[task_events] Channel ${channelName} status:`, status);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, toast]);

  // --- CHAT (notify everyone except the author; optionally scope to active family) ---
  useEffect(() => {
    if (!user?.id) return;

    const filter = activeFamilyId ? `family_id=eq.${activeFamilyId}` : undefined;
    const channelName = `chat:${user.id}:${activeFamilyId ?? 'all'}`;

    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          ...(filter ? { filter } : {}),
        },
        (e) => {
          const row = (e as any).new as ChatMessage | undefined;
          if (!row) {
            console.error('[chat_messages] Realtime event missing .new row:', e);
            return;
          }
          if (row.author_id === user.id) return; // don't notify author

          toast({
            title: 'New chat message',
            description: 'A new message was posted in family chat.',
          });
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[chat_messages] Channel ${channelName} status:`, status);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, activeFamilyId, toast]);

  // --- FAMILY SYNC (categories/templates) — no toasts, just refresh caches ---
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const channelName = `family-sync:${activeFamilyId}`;
    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'family_sync_events',
          filter: `family_id=eq.${activeFamilyId}`,
        },
        (e) => {
          const row = (e as any).new as FamilySyncEvent | undefined;
          if (!row) {
            console.error('[family_sync] Realtime event missing .new row:', e);
            return;
          }
          if (!row.entity || !row.op) {
            console.error('[family_sync] Missing entity/op in row:', row);
            return;
          }

          // Any category/template change triggers a refresh
          debounceRefresh();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[family_sync] Channel ${channelName} status:`, status);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, activeFamilyId, refreshData]);
}
