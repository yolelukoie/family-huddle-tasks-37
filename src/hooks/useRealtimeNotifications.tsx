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
  const { activeFamilyId } = useApp();
  const { refreshData } = useTasks();

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

  const { activeFamilyId, getUserProfile } = useApp(); // add getUserProfile

  // CHAT EVENTS
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;
  
    const chan = `chat-global:${activeFamilyId}`;
    const ch = supabase
      .channel(chan)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const row = (e as any).new as { user_id: string; content: string } | undefined;
          if (!row || row.user_id === user.id) return; // only notify on others' messages
          const name = getUserProfile(row.user_id)?.displayName ?? 'Family member';
          toast({ title: 'New chat message', description: `${name}: ${row.content}` });
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.warn(`[chat-global] Channel status: ${status}`);
      });
  
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, activeFamilyId, toast, getUserProfile]);
  
  // TASK EVENTS (recipient only)
  useEffect(() => {
    if (!user?.id) return;

    const chan = `task-events:${user.id}`;
    const ch = supabase
      .channel(chan)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events', filter: `recipient_id=eq.${user.id}` },
        (e) => {
          const row = (e as any).new as TaskEvent | undefined;
          if (!row) {
            console.error('[task_events] Missing .new in realtime event:', e);
            return;
          }
          if (!row.payload) {
            console.error('[task_events] payload is null:', row);
            return;
          }

          const taskName = row.payload.name;
          const actor = row.payload.actor_name ?? 'Someone';

          if (!taskName) {
            console.error('[task_events] payload missing "name". Row:', row);
          }

          switch (row.event_type) {
            case 'assigned':
              toast({ title: 'New task assigned', description: `${actor} assigned "${taskName ?? 'a task'}" to you.` });
              break;
            case 'accepted':
              toast({ title: 'Task accepted', description: `${actor} accepted "${taskName ?? 'your task'}".` });
              break;
            case 'rejected':
              toast({ title: 'Task rejected', description: `${actor} rejected "${taskName ?? 'your task'}".` });
              break;
            default:
              console.warn('[task_events] Unknown event_type:', row.event_type, 'Row:', row);
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') console.warn(`[task_events] Channel status: ${status}`);
      });

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, toast]);

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
