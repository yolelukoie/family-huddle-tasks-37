import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function DevTestButton() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const { toast } = useToast();

  const insertDummyEvent = async () => {
    if (!user?.id || !activeFamilyId) return;

    const { error } = await (supabase as any)
      .from('task_events')
      .insert([{
        task_id: crypto.randomUUID(),
        family_id: activeFamilyId,
        recipient_id: user.id,
        actor_id: user.id,
        event_type: 'accepted',
        payload: {
          name: 'Test Task',
          stars: 3,
          due_date: new Date().toISOString().split('T')[0],
          actor_name: 'Test User'
        }
      }])
      .select()
      .single();

    if (error) {
      console.error('Failed to insert test event:', error);
      toast({
        title: 'Test Failed',
        description: 'Could not insert test notification',
        variant: 'destructive'
      });
    } else {
      console.log('Test event inserted successfully');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={insertDummyEvent}
        size="sm"
        variant="outline"
        className="bg-background/80 backdrop-blur-sm"
      >
        Test Notification
      </Button>
    </div>
  );
}