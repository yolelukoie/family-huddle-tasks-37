import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useTaskNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`task-events-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_events',
        filter: `recipient_id=eq.${user.id}`,
      }, (payload) => {
        try {
          const e = payload.new as any;
          const type = e?.event_type as 'accepted' | 'rejected';
          const name = e?.payload?.name ?? 'task';
          const who  = e?.payload?.actor_name ?? 'They';
          // Debug
          console.debug('[task_events] received', { type, name, who, raw: payload });

          toast({
            title: type === 'accepted' ? 'Task accepted' : 'Task rejected',
            description: `${who} ${type} "${name}".`,
          });
        } catch (err) {
          console.error('[task_events] handle error', err, payload);
        }
      })
      .subscribe((status) => {
        console.debug('[task_events] channel status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, toast]);
}