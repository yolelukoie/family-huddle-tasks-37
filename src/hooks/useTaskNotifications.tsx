import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export function useTaskNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    // Avoid duplicate channels on re-renders
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`task-events:${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events', filter: `recipient_id=eq.${user.id}` },
        (payload: any) => {
          const e = payload.new;
          const type = e.event_type as 'accepted' | 'rejected';
          const taskName = e.payload?.name ?? 'task';
          const who = e.payload?.actor_name ?? 'They';
          console.debug('[task_events] received', { type, taskName, who, payload: e });

          toast({
            title: type === 'accepted' ? 'Task accepted' : 'Task rejected',
            description: `${who} ${type} "${taskName}".`,
          });
        }
      )
      .subscribe((status) => {
        console.debug('[task_events] channel status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, toast]);
}