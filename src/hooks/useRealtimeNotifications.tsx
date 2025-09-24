// src/hooks/useRealtimeNotifications.tsx
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/hooks/useApp';        // <-- to get activeFamilyId
import { useTasks } from '@/hooks/useTasks';    // <-- to call refreshData()

type TaskEvent = {
  id: string;
  family_id: string;
  task_id: string | null;
  recipient_id: string | null;
  actor_id: string | null;
  event_type: 'assigned' | 'accepted' | 'rejected';
  payload: { task_name?: string; actor_name?: string } | null;
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
  entity: 'task_category' | 'task_template';
  op: 'insert' | 'update' | 'delete';
  entity_id: string;
  payload: any;
  created_at: string;
};

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeFamilyId } = useApp();
  const { refreshData } = useTasks();

  // simple debounce so multiple rapid events cause a single refresh
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRefresh = () => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => {
      refreshTimer.current = null;
      refreshData(); // re-fetch categories/templates/tasks for current family
    }, 150);
  };

  // TASK EVENTS: only rows targeted to me
  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`task-events:${user.id}`)
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
          if (!row) return;

          const taskName = row.payload?.task_name ?? 'the task';
          const actor = row.payload?.actor_name ?? 'Someone';

          switch (row.event_type) {
            case 'assigned':
              toast({ title: 'New task assigned', description: `${actor} assigned "${taskName}" to you.` });
              break;
            case 'accepted':
              toast({ title: 'Task accepted', description: `${actor} accepted "${taskName}".` });
              break;
            case 'rejected':
              toast({ title: 'Task rejected', description: `${actor} rejected "${taskName}".` });
              break;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, toast]);

  // CHAT: notify everyone except the author; scope to active family if available
  useEffect(() => {
    if (!user?.id) return;

    const filter = activeFamilyId
      ? `family_id=eq.${activeFamilyId}`
      : undefined;

    const ch = supabase
      .channel(`chat:${user.id}:${activeFamilyId ?? 'all'}`)
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
          if (!row) return;
          if (row.author_id === user.id) return;

          toast({
            title: 'New chat message',
            description: 'A new message was posted in family chat.',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, activeFamilyId, toast]);

  // FAMILY SYNC (auto-propagation for categories/templates): no toasts, just refresh
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const ch = supabase
      .channel(`family-sync:${activeFamilyId}`)
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
          if (!row) return;

          // Any insert into family_sync_events (category/template change)
          // => refresh categories/templates/tasks
          debounceRefresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, activeFamilyId, refreshData]);
}
