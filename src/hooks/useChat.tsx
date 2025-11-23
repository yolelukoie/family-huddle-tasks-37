import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useApp } from './useApp';
import { supabase } from '@/integrations/supabase/client';
import type { ChatMessage } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

export function useChat() {
  const { user } = useAuth();
  const { activeFamilyId, getUserProfile } = useApp();
  const { toast } = useToast();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatClearedAt, setChatClearedAt] = useState<string | null>(null);

  // Load chat_cleared_at timestamp for the current user
  const loadChatClearedAt = useCallback(async () => {
    if (!user || !activeFamilyId) return;

    try {
      const { data, error } = await supabase
        .from('user_families')
        .select('chat_cleared_at')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .single();

      if (error) {
        console.error('[chat] Error loading chat_cleared_at:', error);
        return;
      }

      setChatClearedAt(data?.chat_cleared_at || null);
    } catch (err) {
      console.error('[chat] Error in loadChatClearedAt:', err);
    }
  }, [user, activeFamilyId]);

  // Load full history for the active family
  const loadMessages = useCallback(async () => {
    if (!user || !activeFamilyId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('family_id', activeFamilyId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('[chat] Error loading messages:', error);
        return;
      }

      // Filter messages based on chat_cleared_at timestamp
      const filtered = chatClearedAt
        ? (data ?? []).filter((msg) => new Date(msg.created_at) > new Date(chatClearedAt))
        : (data ?? []);

      const converted: ChatMessage[] = filtered.map((msg) => {
        const isMine = user.id === msg.user_id;
        const senderProfile = isMine ? null : getUserProfile(msg.user_id);
        const displayName = isMine
          ? user.displayName || 'You'
          : senderProfile?.displayName || 'Family Member';

        return {
          id: msg.id,
          familyId: msg.family_id,
          userId: msg.user_id,
          userDisplayName: displayName,
          content: msg.content,
          timestamp: msg.created_at,
          createdAt: msg.created_at,
        };
      });

      setMessages(converted);
    } catch (err) {
      console.error('[chat] Error in loadMessages:', err);
    } finally {
      setLoading(false);
    }
  }, [user, activeFamilyId, getUserProfile, chatClearedAt]);

  // Load chat_cleared_at when family changes
  useEffect(() => {
    loadChatClearedAt();
  }, [loadChatClearedAt]);

  // Load messages when family or chatClearedAt changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Realtime subscription for new messages
  useEffect(() => {
    if (!activeFamilyId || !user?.id) return;

    const channelName = `chat-page:${user.id}:${activeFamilyId}`;
    const filter = `family_id=eq.${activeFamilyId}`;

    const ch = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter },
        (e) => {
          const newRow = (e as any).new as {
            id: string;
            family_id: string;
            user_id: string;
            content: string;
            created_at: string;
          } | undefined;

          if (!newRow) {
            console.error('[chat] Realtime event missing .new:', e);
            return;
          }

          const isMine = newRow.user_id === user.id;
          const senderProfile = isMine ? null : getUserProfile(newRow.user_id);
          const displayName = isMine
            ? user.displayName || 'You'
            : senderProfile?.displayName || 'Family Member';

          const converted: ChatMessage = {
            id: newRow.id,
            familyId: newRow.family_id,
            userId: newRow.user_id,
            userDisplayName: displayName,
            content: newRow.content,
            timestamp: newRow.created_at,
            createdAt: newRow.created_at,
          };

          setMessages((prev) => [...prev, converted]);

          // Toast only for messages from others
          if (!isMine) {
            toast({
              title: 'New chat message',
              description: `${displayName}: ${newRow.content}`,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') {
          console.warn(`[chat] Channel ${channelName} status: ${status}`);
        }
      });

    return () => {
      supabase.removeChannel(ch);
    };
  }, [activeFamilyId, user?.id, user?.displayName, getUserProfile, toast]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!user || !activeFamilyId || !content.trim()) return false;

      try {
        const { error } = await supabase.from('chat_messages').insert([
          {
            family_id: activeFamilyId,
            user_id: user.id,
            content: content.trim(),
          },
        ]);

        if (error) {
          console.error('[chat] Error sending message:', error);
          toast({
            title: 'Error',
            description: 'Failed to send message',
            variant: 'destructive',
          });
          return false;
        }

        return true;
      } catch (err) {
        console.error('[chat] Error in sendMessage:', err);
        toast({
          title: 'Error',
          description: 'Failed to send message',
          variant: 'destructive',
        });
        return false;
      }
    },
    [user, activeFamilyId, toast]
  );

  const refreshMessages = useCallback(() => {
    loadMessages();
  }, [loadMessages]);

  const clearChat = useCallback(async () => {
    if (!user || !activeFamilyId) return false;

    try {
      const { error } = await supabase
        .from('user_families')
        .update({ chat_cleared_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId);

      if (error) {
        console.error('[chat] Error clearing chat:', error);
        toast({
          title: 'Error',
          description: 'Failed to clear chat',
          variant: 'destructive',
        });
        return false;
      }

      // Update local state
      setChatClearedAt(new Date().toISOString());
      setMessages([]);
      
      toast({
        title: 'Chat cleared',
        description: 'Your chat history has been cleared',
      });

      return true;
    } catch (err) {
      console.error('[chat] Error in clearChat:', err);
      toast({
        title: 'Error',
        description: 'Failed to clear chat',
        variant: 'destructive',
      });
      return false;
    }
  }, [user, activeFamilyId, toast]);

  return {
    messages,
    loading,
    sendMessage,
    refreshMessages,
    clearChat,
  };
}
