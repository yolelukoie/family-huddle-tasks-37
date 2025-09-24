import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

type TaskEventRow = {
  id: string;
  family_id: string;
  task_id: string;
  actor_id: string;
  recipient_id: string;
  event_type: 'accepted' | 'rejected' | string;
  payload: { task_name?: string; actor_name?: string } | null;
  created_at: string;
};

export function useTaskNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`task-events-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_events',
          filter: `recipient_id=eq.${user.id}`,
        },
        (e) => {
          const row = (e as any).new as TaskEventRow | undefined;
          if (!row) return;

          const type = row.event_type;
          const name = row.payload?.task_name ?? 'the task';
          const who  = row.payload?.actor_name ?? 'They';

          toast({
            title: type === 'accepted' ? 'Task accepted' : 'Task rejected',
            description: `${who} ${type} "${name}".`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, toast]);
}
