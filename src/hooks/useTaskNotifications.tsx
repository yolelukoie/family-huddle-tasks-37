import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useTaskNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel(`task-events-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'task_events',
        filter: `recipient_id=eq.${user.id}`,
      }, (payload: any) => {
        const e = payload.new;
        const type = e.event_type as 'accepted'|'rejected';
        const name = e.payload?.name ?? 'task';
        const who  = e.payload?.actor_name ?? 'They';
        toast({
          title: type === 'accepted' ? 'Task accepted' : 'Task rejected',
          description: `${who} ${type} "${name}".`,
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id, toast]);
}