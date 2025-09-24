import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

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

export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    // TASK EVENTS: only deliver rows targeted to me
    const taskCh = supabase
      .channel(`task-events:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events', filter: `recipient_id=eq.${user.id}` },
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

    // CHAT MESSAGES: notify all family members except the author
    const chatCh = supabase
      .channel(`chat:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (e) => {
          const row = (e as any).new as ChatMessage | undefined;
          if (!row) return;
          if (row.author_id === user.id) return; // don't notify author

          // If you have per-family scoping in the UI already, you can further filter by current family.
          // Otherwise, toast globally:
          toast({ title: 'New chat message', description: 'A new message was posted in family chat.' });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(taskCh);
      supabase.removeChannel(chatCh);
    };
  }, [user?.id, toast]);
}

