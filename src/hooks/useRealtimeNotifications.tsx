// src/hooks/useRealtimeNotifications.tsx
import { useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useApp } from '@/hooks/useApp';
import { useTasks } from '@/hooks/useTasks';
import { useAssignmentModal } from "@/contexts/AssignmentModalContext";
import { taskFromRow } from '@/lib/taskMapper';
import { ROUTES } from '@/lib/constants';

type TaskEvent = {
  id: string;
  family_id: string;
  task_id: string | null;
  recipient_id: string | null;
  actor_id: string | null;
  event_type: 'assigned' | 'accepted' | 'rejected' | 'completed' | string;
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
  const { t } = useTranslation();
  const { refreshData } = useTasks();
  const { activeFamilyId, getUserProfile } = useApp();
  const { openAssignmentModal } = useAssignmentModal();
  const location = useLocation();

  const handledEventIds = useRef<Set<string>>(new Set());

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

  // TASK EVENTS
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `task-events:${user.id}`;
    console.log(`[task-events] Creating channel for user ${user.id}`);

    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_events', filter: `recipient_id=eq.${user.id}` },
        async (e) => {
          const row = (e as any).new as TaskEvent | undefined;
          if (!row) return;

          if (row.id && handledEventIds.current.has(row.id)) return;
          if (row.id) handledEventIds.current.add(row.id);

          if (row.event_type === 'assigned') {
            try {
              const { data, error } = await supabase
                .from('tasks')
                .select('*')
                .eq('id', row.task_id)
                .single();

              if (error || !data) return;
              if (data.assigned_to !== user.id) return;

              const taskFamilyId = row.family_id || data.family_id;
              openAssignmentModal(taskFromRow(data, { familyId: taskFamilyId }));
            } catch (err) {
              console.error('[REALTIME] Error in assigned handler:', err);
            }
            return; // NO TOAST for 'assigned'
          }

          const actor = row.payload?.actor_name ?? 'Someone';
          const taskName = row.payload?.name ?? 'your task';
          if (row.event_type === 'accepted') {
            toast({ title: 'Task accepted', description: `${actor} accepted "${taskName}".` });
          } else if (row.event_type === 'rejected') {
            toast({ title: 'Task rejected', description: `${actor} rejected "${taskName}".` });
          } else if (row.event_type === 'completed') {
            toast({ title: 'Task completed', description: `${actor} completed "${taskName}".` });
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[task-events] ✓ Subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('[task-events] Channel error:', err);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, openAssignmentModal, toast]);

  // CHAT EVENTS — toast when user is NOT on the chat page (global coverage)
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;
    const ch = supabase
      .channel(`chat-toast:${user.id}:${activeFamilyId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const newRow = (e as { new: { user_id: string; content: string } }).new;
          if (!newRow) return;
          if (newRow.user_id === user.id) return;
          if (location.pathname === ROUTES.chat) return;
          const senderProfile = getUserProfile(newRow.user_id);
          const displayName = senderProfile?.displayName ?? 'Someone';
          toast({ title: t('chat.newMessage'), description: `${displayName}: ${newRow.content}` });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, activeFamilyId, location.pathname, getUserProfile, toast, t]);

  // FAMILY SYNC (categories/templates)
  useEffect(() => {
    if (!user?.id || !activeFamilyId) return;

    const channelName = `family-sync:${activeFamilyId}`;

    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'family_sync_events', filter: `family_id=eq.${activeFamilyId}` },
        (e) => {
          const row = (e as any).new as FamilySyncEvent | undefined;
          if (!row) return;
          debounceRefresh();
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[family-sync] Channel status: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id, activeFamilyId, debounceRefresh]);
}
